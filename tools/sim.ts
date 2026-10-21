// Balance simulator. Plays simulated days through the real engine for three
// player types and prints level, gold, vitality and boss numbers, plus a rough
// reference model of Habitica's public rules (numbers only, written from
// scratch here) for comparison.
// Run: npx vite-node tools/sim.ts   (optional: --days 180 --seeds 24)
import { BOSSES, GEAR, CALLINGS, FAMILIARS, PERKS } from '../src/engine/content';
import {
  addOath, buyGear, canForge, canLearn, completeTodo, dayTurn, forge, inviteBoss, isDueOn, keepDaily, kindle, learnPerk,
  maxHp, priceOf, rest, tapHabit, today, xpToNext,
} from '../src/engine/rules';
import { newSave } from '../src/engine/save';
import type { Save } from '../src/engine/types';

const arg = (k: string, d: number) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DAYS = arg('--days', 180);
const SEEDS = arg('--seeds', 24);
const CHECK = [14, 30, 90, 180].filter((d) => d <= DAYS);

function rngOf(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const T0 = new Date(2026, 0, 5, 0, 0).getTime(); // a Monday
const at = (day: number, min: number) => T0 + day * 86400000 + min * 60000;

interface Profile { name: string; p: number; spam?: number; perks: string[]; passive?: boolean; }
const PERK_ORDER: Record<string, string[]> = {
  hearth: ['soft_landing', 'banked_coals', 'mercy', 'gleaner', 'thrift', 'omen_reader', 'keen_edge', 'follow_through', 'bright_eye'],
  craft: ['gleaner', 'thrift', 'omen_reader', 'soft_landing', 'banked_coals', 'mercy', 'keen_edge', 'follow_through', 'bright_eye'],
  blade: ['keen_edge', 'follow_through', 'bright_eye', 'gleaner', 'thrift', 'omen_reader', 'soft_landing', 'banked_coals', 'mercy'],
};
const PROFILES: Profile[] = [
  { name: 'steady (90%)', p: 0.9, perks: PERK_ORDER.blade },
  { name: 'average (60%)', p: 0.6, perks: PERK_ORDER.craft },
  { name: 'struggling (30%)', p: 0.3, perks: PERK_ORDER.hearth },
];
// a struggler who never rests, kindles, forges or spends skill points
const PASSIVE: Profile = { name: 'struggling, hands-off (30%, never rests/kindles/forges/learns)', p: 0.3, perks: [], passive: true };
const EXPLOIT: Profile = { name: 'min-maxer (90% + 15 habit taps/day)', p: 0.9, spam: 15, perks: ['gleaner', 'thrift', 'omen_reader', 'keen_edge', 'follow_through', 'bright_eye', 'soft_landing', 'banked_coals', 'mercy'] };

interface Run {
  level: Record<number, number>; earned: Record<number, number>; xp: Record<number, number>;
  falls: number; fallDays: number[]; firstGear: number | null; afford45: number | null; afford80: number | null;
  bossDays: Record<string, number>; lowDays: number; bonusGear: Record<number, number>; spentRewards: number;
}

function play(pr: Profile, seed: number): Run {
  const rng = rngOf(seed * 7919 + Math.round(pr.p * 100));
  const calling = CALLINGS[seed % CALLINGS.length].id;
  const familiar = FAMILIARS[seed % FAMILIARS.length].id;
  const s: Save = newSave({ name: 'Sim', calling, outfit: 'wayfarer', familiar, look: { sex: 'female', skin: 'light', hair: 'plain', hairColor: 'black' } }, at(0, 9 * 60), rng);
  const all = [0, 1, 2, 3, 4, 5, 6];
  const nDaily = 3 + (seed % 3);
  if (nDaily >= 4) addOath(s, { kind: 'daily', title: 'Read 5 pages', difficulty: 'easy', stat: 'wit', days: all }, at(0, 540), rng);
  if (nDaily >= 5) addOath(s, { kind: 'daily', title: 'Lights out by 11', difficulty: 'medium', stat: 'grit', days: all }, at(0, 540), rng);
  addOath(s, { kind: 'habit', title: 'Drank water', difficulty: 'trivial', stat: 'grit', up: true, down: false }, at(0, 540), rng);
  const r: Run = { level: {}, earned: {}, xp: {}, falls: 0, fallDays: [], firstGear: null, afford45: null, afford80: null, bossDays: {}, lowDays: 0, bonusGear: {}, spentRewards: 0 };
  let earned = 0, xpTotal = 0, questStart = 0;
  const track = <T>(day: number, f: () => T): T | undefined => {
    const g0 = s.hero.gold, l0 = s.hero.level, x0 = s.hero.xp, q0 = s.quest?.boss;
    let out: T | undefined;
    try { out = f(); } catch { return undefined; }
    if (s.hero.gold > g0) earned += s.hero.gold - g0;
    // xp gained (level-ups reset the bar)
    let gx = 0; if (s.hero.level > l0) { gx = xpToNext(l0) - x0 + s.hero.xp; for (let l = l0 + 1; l < s.hero.level; l++) gx += xpToNext(l); } else if (s.hero.xp > x0) gx = s.hero.xp - x0;
    xpTotal += gx;
    if (q0 && !s.quest) { r.bossDays[q0] = day - questStart + 1; }
    return out;
  };
  for (let day = 0; day < DAYS; day++) {
    let t = (7 + Math.floor(rng() * 4)) * 60 + Math.floor(rng() * 60);
    const fallsBefore = r.falls;
    // the dawn
    const g0 = s.hero.gold;
    const rep = dayTurn(s, at(day, t));
    if (rep?.fell) { r.falls++; r.fallDays.push(day); }
    void g0;
    if (s.hero.hp <= maxHp(s) * 0.25) r.lowDays++;
    if (!s.quest) { const b = BOSSES.find((x) => !s.defeated.includes(x.id) && (!x.needs || s.defeated.includes(x.needs))); if (b) { inviteBoss(s, b.id, at(day, t)); questStart = day; } }
    const d = today(s, at(day, t));
    const step = () => { t += rng() < 0.6 ? 2 + Math.floor(rng() * 13) : 30 + Math.floor(rng() * 210); if (t > 23 * 60) t = 23 * 60 + Math.floor(rng() * 50); };
    for (const o of s.oaths.filter((x) => isDueOn(x, d))) {
      if (rng() < pr.p) { step(); track(day, () => keepDaily(s, o.id, at(day, t), rng)); }
    }
    for (const o of s.oaths.filter((x) => x.kind === 'habit' && x.up)) {
      const taps = pr.spam ?? (rng() < pr.p ? 1 + (rng() < pr.p ? 1 : 0) : 0);
      for (let i = 0; i < taps; i++) { step(); track(day, () => tapHabit(s, o.id, 1, at(day, t), rng)); }
    }
    for (const o of s.oaths.filter((x) => x.kind === 'habit' && x.down)) {
      if (rng() < (1 - pr.p) * 0.6) { step(); const res = track(day, () => tapHabit(s, o.id, -1, at(day, t), rng)) as any; if (res?.fell) { r.falls++; r.fallDays.push(day); } }
    }
    if (day % 4 === 0) addOath(s, { kind: 'todo', title: 'Errand ' + day, difficulty: 'medium', stat: 'craft' }, at(day, t), rng);
    for (const o of s.oaths.filter((x) => x.kind === 'todo' && !x.done)) if (rng() < pr.p * 0.35) { step(); track(day, () => completeTodo(s, o.id, at(day, t), rng)); }
    // housekeeping a sensible player would do
    const now = at(day, t);
    if (pr.passive) { /* skip housekeeping except buying gear */ } else {
    while (s.hero.skillPoints > 0) { const p = pr.perks.find((x) => !canLearn(s, x)); if (!p) break; learnPerk(s, p, now); }
    if (s.hero.hp <= maxHp(s) - 12) { try { rest(s, now); } catch { /* no mana */ } }
    if (s.hero.hp <= maxHp(s) * 0.5 && !canForge(s, 'r_tonic')) forge(s, 'r_tonic', now);
    if (!canForge(s, 'r_ember')) forge(s, 'r_ember', now);
    if (s.hero.embers < 2) { try { kindle(s, now); } catch { /* not enough */ } }
    }
    const buyable = GEAR.filter((g) => g.source === 'market' && g.bonus && !s.hero.gear.includes(g.id)).sort((a, b) => a.price - b.price);
    for (const g of buyable) if (s.hero.gold >= priceOf(s, g.price)) { buyGear(s, g.id, now); if (r.firstGear === null) r.firstGear = day + 1; }
    if (r.afford45 === null && earned >= 45) r.afford45 = day + 1;
    if (r.afford80 === null && earned >= 80) r.afford80 = day + 1;
    void fallsBefore;
    if (CHECK.includes(day + 1)) { r.level[day + 1] = s.hero.level + s.hero.xp / xpToNext(s.hero.level); r.earned[day + 1] = earned; r.xp[day + 1] = xpTotal; r.bonusGear[day + 1] = s.hero.gear.filter((g) => GEAR.find((x) => x.id === g)?.source === 'market').length; }
  }
  return r;
}

// ---------------------------------------------------------------- Habitica reference model (approximate)
// From the public rules: task value v drifts up when kept, down when missed;
// rewards scale with 0.9747^v; priority trivial .1, easy 1, medium 1.5, hard 2.
// XP to level: 25/lvl to 4, 150 at 5, then ~(l^2/4 + 10l + 140) rounded to tens.
// A miss costs about 2 x priority x 0.9747^v vitality (min 1), 50 max, no
// natural regen; a level-up refills; death costs a level and all gold.
const habNext = (l: number) => (l < 5 ? 25 * l : l === 5 ? 150 : Math.round((l * l * 0.25 + 10 * l + 139.75) / 10) * 10);
function habitica(p: number, seed: number) {
  const rng = rngOf(seed * 104729 + Math.round(p * 100));
  const cl = (v: number) => Math.max(-47.27, Math.min(21.27, v));
  const nDaily = 3 + (seed % 3);
  const pri = [0.1, 1, 1.5, 1, 1.5].slice(0, nDaily);
  const dailies = pri.map((x) => ({ pri: x, v: 0, streak: 0 }));
  const habits = [{ pri: 1, v: 0 }, { pri: 0.1, v: 0 }];
  const bad = { pri: 1, v: 0 };
  let lvl = 1, xp = 0, gp = 0, hp = 50, deaths = 0, earned = 0, boss = 100, bossDay: number | null = null, afford30: number | null = null;
  const out: Record<number, { level: number; earned: number }> = {};
  const gainXp = (n: number) => { xp += n; while (xp >= habNext(lvl)) { xp -= habNext(lvl); lvl++; hp = 50; } };
  const up = (t: { pri: number; v: number }, habit = false, streak = 0) => {
    const dl = 0.9747 ** cl(t.v); t.v += dl;
    const crit = rng() < 0.03 ? 1.5 : 1;
    gainXp(Math.round(dl * t.pri * crit * 6));
    let g = dl * t.pri * crit; if (streak) g = Math.max(g * (1 + streak / 100), g + 1);
    gp += Math.ceil(g); earned += Math.ceil(g);
    if (boss > 0) boss -= Math.ceil(dl * crit * (habit ? 0.5 : 1));
  };
  for (let day = 0; day < DAYS; day++) {
    let down = 0;
    for (const d of dailies) {
      if (rng() < p) { d.streak++; up(d, false, d.streak); } else {
        const dl = 0.9747 ** cl(d.v); d.v -= dl; d.streak = 0;
        hp -= Math.max(1, Math.floor(dl * d.pri * 2)); down += dl * Math.min(1, d.pri);
      }
    }
    for (const h of habits) { const taps = rng() < p ? 1 + (rng() < p ? 1 : 0) : 0; for (let i = 0; i < taps; i++) up(h, true); h.v /= 2; }
    if (rng() < (1 - p) * 0.6) { const dl = 0.9747 ** cl(bad.v); bad.v -= dl; hp -= Math.max(1, Math.floor(dl * bad.pri * 2)); }
    if (day % 4 === 0 && rng() < p) up({ pri: 1.5, v: -2 * (1 - p) * 4 });
    if (boss > 0) hp -= Math.round(down * 0.5); // starter boss strength 0.5
    if (boss <= 0 && bossDay === null) bossDay = day + 1;
    if (hp < 20 && gp >= 25) { gp -= 25; hp = Math.min(50, hp + 15); } // health potion
    if (hp <= 0) { deaths++; lvl = Math.max(1, lvl - 1); xp = 0; gp = 0; hp = 50; }
    if (afford30 === null && earned >= 30) afford30 = day + 1;
    if (CHECK.includes(day + 1)) out[day + 1] = { level: lvl + xp / habNext(lvl), earned };
  }
  return { out, deaths, bossDay, afford30 };
}

// ---------------------------------------------------------------- report
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const med = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; };
const f1 = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '-');

console.log(`Hearthbound balance sim: ${SEEDS} heroes per type, ${DAYS} days, 3-5 dailies + 3 habits + an errand every 4 days.`);
console.log(`XP to next level: L1 ${xpToNext(1)}, L2 ${xpToNext(2)}, L5 ${xpToNext(5)}, L10 ${xpToNext(10)}, L20 ${xpToNext(20)}, L30 ${xpToNext(30)} | Habitica: ${habNext(1)}, ${habNext(2)}, ${habNext(5)}, ${habNext(10)}, ${habNext(20)}, ${habNext(30)}`);
console.log(`Bosses: ${BOSSES.map((b) => `${b.name} ${b.hp} hp`).join(', ')}; perks: ${PERKS.length}`);
const NOPERKS: Profile = { name: 'steady (90%) with no perks, for comparison', p: 0.9, perks: [] };
for (const pr of [...PROFILES, PASSIVE, NOPERKS, EXPLOIT]) {
  const runs = Array.from({ length: SEEDS }, (_, i) => play(pr, i + 1));
  console.log(`\n== ${pr.name}`);
  for (const d of CHECK) console.log(`  day ${String(d).padStart(3)}: level ${f1(avg(runs.map((r) => r.level[d])))}  gold earned ${Math.round(avg(runs.map((r) => r.earned[d])))} (${f1(avg(runs.map((r) => r.earned[d])) / d)}/day)  xp ${Math.round(avg(runs.map((r) => r.xp[d])) / d)}/day  market gear owned ${f1(avg(runs.map((r) => r.bonusGear[d])))}`);
  const falls = runs.map((r) => r.falls);
  console.log(`  falls in ${DAYS} days: avg ${f1(avg(falls))} (= ${f1(avg(falls) / (DAYS / 14))} per fortnight), worst hero ${Math.max(...falls)}; first 30 days avg ${f1(avg(runs.map((r) => r.fallDays.filter((x) => x < 30).length)))}; days at <=25% vitality ${f1(avg(runs.map((r) => r.lowDays)))}`);
  console.log(`  days to earn 45 gold: ${f1(med(runs.map((r) => r.afford45 ?? 999)))}, 80 gold: ${f1(med(runs.map((r) => r.afford80 ?? 999)))}; first bonus gear bought on day ${f1(med(runs.map((r) => r.firstGear ?? 999)))} (median)`);
  for (const b of BOSSES) { const ds = runs.map((r) => r.bossDays[b.id]).filter((x) => x !== undefined); console.log(`  ${b.name}: beaten by ${ds.length}/${SEEDS}, median ${f1(med(ds))} days`); }
}
console.log('\n== Habitica reference model (same players, approximate)');
for (const pr of PROFILES) {
  const runs = Array.from({ length: SEEDS }, (_, i) => habitica(pr.p, i + 1));
  console.log(`  ${pr.name}: ${CHECK.map((d) => `day ${d} L${f1(avg(runs.map((r) => r.out[d].level)))} ${Math.round(avg(runs.map((r) => r.out[d].earned)))}g`).join(' | ')}; deaths/${DAYS}d ${f1(avg(runs.map((r) => r.deaths)))} (${f1(avg(runs.map((r) => r.deaths)) / (DAYS / 14))}/fortnight); 30g on day ${f1(med(runs.map((r) => r.afford30 ?? 999)))}; 100-hp starter boss ${f1(med(runs.map((r) => r.bossDay ?? 999)))} days`);
}
