import { BOSSES, bossById, CALLINGS, FAMILIARS, GEAR, KID_REWARD_IDEAS, OUTFITS, REWARD_IDEAS, gearById } from './content';
import { addOath, gainXp, maxHp, maxMana, omenFor, uid, xpToNext } from './rules';
import { hearthDay, type DayKey } from './time';
import type { BossRecord, Chore, DayLog, Difficulty, HeroMode, Look, Oath, Pause, Save, Slot, Stat, Stats } from './types';
import { seasonIdOf } from './season';
import { checkBadges } from './achievements';
import { syncStory } from './story';

/** v4 (Hearthbound v2): family heroes, story, seasons, badges, history, chores, rest days. */
export const SAVE_VERSION = 4;
export const KEY = 'hearthbound.save';
export const BACKUP_KEY = 'hearthbound.save.backup';

export interface NewHero { name: string; look: Look; calling: string; outfit: string; familiar: string; mode?: HeroMode; }

/** Picture oaths for little ones (a grown-up can add more from the presets). */
export const KID_PRESETS: { icon: string; title: string; stat: Stat }[] = [
  { icon: '🪥', title: 'Brush teeth (morning)', stat: 'grit' }, { icon: '👕', title: 'Get dressed', stat: 'craft' },
  { icon: '🧸', title: 'Tidy my toys', stat: 'craft' }, { icon: '🌳', title: 'Play outside', stat: 'might' },
  { icon: '📚', title: 'Read a story', stat: 'wit' }, { icon: '🌙', title: 'Brush teeth (night)', stat: 'grit' },
  { icon: '🛁', title: 'Bath time', stat: 'grit' }, { icon: '🥦', title: 'Try a veggie', stat: 'grit' },
  { icon: '💧', title: 'Drink water', stat: 'grit' }, { icon: '👟', title: 'Shoes on', stat: 'craft' },
  { icon: '🍽️', title: 'Help at dinner', stat: 'craft' }, { icon: '🎒', title: 'Pack my bag', stat: 'craft' },
  { icon: '😴', title: 'Bed on time', stat: 'grit' }, { icon: '🤗', title: 'Be kind to someone', stat: 'wit' },
  { icon: '🙏', title: 'Say thank you', stat: 'wit' }, { icon: '🎨', title: 'Draw a picture', stat: 'wit' },
  { icon: '🚽', title: 'Potty', stat: 'grit' }, { icon: '🐾', title: 'Feed the pet', stat: 'craft' },
];
/** Tiny, zero-planning wins: no schedule, tap when it happens. */
export const TINY_PRESETS: { icon: string; title: string; stat: Stat }[] = [
  { icon: '💧', title: 'Drank some water', stat: 'grit' }, { icon: '💊', title: 'Took my meds', stat: 'grit' },
  { icon: '🌿', title: 'Stepped outside', stat: 'might' }, { icon: '🍎', title: 'Ate something', stat: 'grit' },
  { icon: '🧺', title: 'Two-minute tidy', stat: 'craft' }, { icon: '💬', title: 'Messaged someone', stat: 'wit' },
  { icon: '🧘', title: 'Took a slow breath', stat: 'grit' }, { icon: '🚿', title: 'Showered', stat: 'grit' },
  { icon: '📖', title: 'Read a page', stat: 'wit' }, { icon: '🧹', title: 'Put one thing away', stat: 'craft' },
];

export function validateNewHero(n: NewHero): string | null {
  const name = n.name.trim();
  if (!name) return 'Your hero needs a name.';
  if (name.length > 24) return 'Keep the name to 24 characters.';
  if (!CALLINGS.some((c) => c.id === n.calling)) return 'Choose a calling.';
  if (!OUTFITS.some((o) => o.id === n.outfit)) return 'Choose an outfit.';
  if (!FAMILIARS.some((f) => f.id === n.familiar)) return 'Choose a familiar.';
  if (n.look.sex !== 'female' && n.look.sex !== 'male') return 'Choose a body.';
  return null;
}

/** Familiars other than Soot cost gold later; at the start you may pick any one as a gift. */
export function newSave(n: NewHero, now: number, rng: () => number = Math.random): Save {
  const err = validateNewHero(n);
  if (err) throw new Error(err);
  const outfit = OUTFITS.find((o) => o.id === n.outfit)!;
  const gear = outfit[n.look.sex];
  const equipped: Partial<Record<Slot, string>> = {};
  for (const id of gear) equipped[gearById(id)!.slot] = id;
  const day = hearthDay(now, 4);
  const mode: HeroMode = n.mode === 'kid' || n.mode === 'gentle' ? n.mode : 'standard';
  const s: Save = {
    version: SAVE_VERSION,
    createdAt: now,
    hero: {
      name: n.name.trim(), calling: n.calling, look: { ...n.look }, level: 1, xp: 0, hp: 50, gold: 0, mana: 10, embers: 1,
      skillPoints: 0, perks: [], statXp: { might: 0, wit: 0, grit: 0, craft: 0 }, titles: [], title: null,
      familiar: n.familiar, familiars: [...new Set(['soot', n.familiar])], gear: [...gear], equipped,
    },
    oaths: [], rewards: [],
    materials: { iron: 0, herb: 0, thread: 0, ink: 0, ember: 0, gel: 0 },
    quest: null, defeated: [], focus: null,
    day: { key: day, omen: omenFor(day).id, combo: 0, lastKeepAt: 0, rested: false, gifted: false },
    lastDay: day, dawn: null, chronicle: [],
    mind: { log: [], dismissed: {}, accepted: 0 },
    settings: { dayStart: 4, sound: true, location: 'inn', reminder: { on: false, time: mode === 'kid' ? '18:30' : '19:00' }, noPenalty: mode !== 'standard' },
    weekly: { week: '', mercyUsed: false, coalsGiven: false },
    stats: emptyStats(),
    mode, bonds: { [n.familiar]: 0, soot: 0 }, story: { chapter: 1, base: null, claimed: [] }, season: { id: seasonIdOf(day), sparks: 0, got: [] },
    achievements: {}, history: {}, bossLog: [], chores: [], pauses: [], reportSeen: '',
  };
  s.hero.hp = maxHp(s);
  const all = [0, 1, 2, 3, 4, 5, 6];
  if (mode === 'kid') {
    for (const k of KID_PRESETS.slice(0, 6)) addOath(s, { kind: 'daily', title: k.title, difficulty: 'trivial', stat: k.stat, days: all }, now, rng).icon = k.icon;
    for (const r of KID_REWARD_IDEAS) s.rewards.push({ id: uid(rng), title: r.title, cost: r.cost, bought: 0 });
    s.chronicle.push({ t: now, text: `${s.hero.name} lit a little hearth.`, kind: 'life' });
    return s;
  }
  if (mode === 'gentle') {
    for (const k of TINY_PRESETS.slice(0, 6)) addOath(s, { kind: 'habit', title: k.title, difficulty: 'trivial', stat: k.stat, up: true, down: false }, now, rng).icon = k.icon;
    for (const r of REWARD_IDEAS) s.rewards.push({ id: uid(rng), title: r.title, cost: r.cost, bought: 0 });
    s.chronicle.push({ t: now, text: `${s.hero.name} lit the hearth, gently.`, kind: 'life' });
    return s;
  }
  addOath(s, { kind: 'daily', title: 'Drink a glass of water when you wake', difficulty: 'trivial', stat: 'grit', days: all }, now, rng);
  addOath(s, { kind: 'daily', title: 'Ten-minute tidy', difficulty: 'easy', stat: 'craft', days: all }, now, rng);
  addOath(s, { kind: 'daily', title: 'Walk outside for 15 minutes', difficulty: 'medium', stat: 'might', days: all }, now, rng);
  addOath(s, { kind: 'habit', title: 'Put the phone down and did the thing', difficulty: 'easy', stat: 'wit', up: true, down: false }, now, rng);
  addOath(s, { kind: 'habit', title: 'Doom-scrolled past bedtime', difficulty: 'easy', stat: 'grit', up: false, down: true }, now, rng);
  addOath(s, { kind: 'todo', title: 'Book that appointment you keep meaning to', difficulty: 'medium', stat: 'craft' }, now, rng);
  for (const r of REWARD_IDEAS) s.rewards.push({ id: uid(rng), title: r.title, cost: r.cost, bought: 0 });
  s.chronicle.push({ t: now, text: `${s.hero.name} lit the hearth.`, kind: 'life' });
  return s;
}

// ---------------------------------------------------------------- sanitize / migrate
const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number, min = -Infinity, max = Infinity) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const arr = <T>(v: unknown, f: (x: any) => T | null): T[] => (Array.isArray(v) ? v.map(f).filter((x): x is T => x !== null) : []);
const DIFFS: Difficulty[] = ['trivial', 'easy', 'medium', 'hard'];
const STATS: Stat[] = ['might', 'wit', 'grit', 'craft'];
const dayKey = (v: unknown, d: DayKey) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : d);

function cleanOath(o: any, now: number): Oath | null {
  if (!isObj(o) || typeof o.title !== 'string' || !o.title.trim()) return null;
  const kind = o.kind === 'habit' || o.kind === 'todo' ? o.kind : o.kind === 'daily' ? 'daily' : null;
  if (!kind) return null;
  const day0 = hearthDay(num(o.createdAt, now), 4);
  const days = arr(o.days, (d) => (Number.isInteger(d) && d >= 0 && d <= 6 ? d : null));
  return {
    id: str(o.id, uid()), kind, title: o.title.slice(0, 80), notes: str(o.notes, ''),
    difficulty: DIFFS.includes(o.difficulty) ? o.difficulty : 'easy', stat: STATS.includes(o.stat) ? o.stat : 'grit',
    days: kind === 'daily' ? (days.length ? days : [0, 1, 2, 3, 4, 5, 6]) : [],
    streak: num(o.streak, 0, 0), bestStreak: num(o.bestStreak, num(o.streak, 0, 0), 0), doneDay: o.doneDay ? dayKey(o.doneDay, '') || null : null,
    up: kind === 'habit' ? o.up !== false : false, down: kind === 'habit' ? !!o.down : false, ups: num(o.ups, 0, 0), downs: num(o.downs, 0, 0),
    done: !!o.done, doneAt: o.doneAt ? num(o.doneAt, now) : null, createdAt: num(o.createdAt, now), createdDay: dayKey(o.createdDay, day0),
    cold: kind === 'daily' ? Math.floor(num(o.cold, 0, 0, 3)) : 0,
    ...(typeof o.icon === 'string' && o.icon.length <= 8 ? { icon: o.icon } : {}),
  };
}

export function emptyStats(): Stats {
  return {
    keeps: 0, slips: 0, misses: 0, focusMinutes: 0, bossesDown: 0, dailyKeeps: 0, todos: 0, habitUps: 0, perfectDays: 0, rewardsBought: 0,
    forged: 0, rekindles: 0, earlyKeeps: 0, choreSteps: 0, choreBosses: 0, xpTotal: 0, goldTotal: 0, restDays: 0, rites: 0,
    statKeeps: { might: 0, wit: 0, grit: 0, craft: 0 },
  };
}
const MODES: HeroMode[] = ['standard', 'gentle', 'kid'];
const timeStr = (v: unknown, d: string) => (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);

function cleanStats(raw: any): Stats {
  const st = emptyStats();
  if (!isObj(raw)) return st;
  for (const k of Object.keys(st) as (keyof Stats)[]) if (k !== 'statKeeps') (st as any)[k] = num(raw[k], 0, 0);
  if (isObj(raw.statKeeps)) for (const x of STATS) st.statKeeps[x] = num(raw.statKeeps[x], 0, 0);
  return st;
}
function cleanHistory(raw: unknown): Record<DayKey, DayLog> {
  const out: Record<DayKey, DayLog> = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !isObj(v)) continue;
    out[k] = { due: num(v.due, 0, 0), kept: num(v.kept, 0, 0), keeps: num(v.keeps, 0, 0), xp: num(v.xp, 0, 0), gold: num(v.gold, 0, 0), focus: num(v.focus, 0, 0), ...(v.paused ? { paused: true } : {}), ...(v.perfect ? { perfect: true } : {}) };
  }
  return out;
}
function cleanChore(c: any): Chore | null {
  if (!isObj(c) || typeof c.name !== 'string' || !Array.isArray(c.steps)) return null;
  const steps = arr(c.steps, (x) => (isObj(x) && typeof x.title === 'string' ? { id: str(x.id, uid()), title: x.title.slice(0, 80), done: !!x.done, doneAt: x.doneAt ? num(x.doneAt, 0) : null } : null));
  if (!steps.length) return null;
  return {
    id: str(c.id, uid()), name: c.name.slice(0, 40), art: str(c.art, 'slime'), difficulty: DIFFS.includes(c.difficulty) ? c.difficulty : 'easy',
    stat: STATS.includes(c.stat) ? c.stat : 'craft', steps, createdAt: num(c.createdAt, 0), beatenAt: c.beatenAt ? num(c.beatenAt, 0) : null,
  };
}
const cleanPause = (p: any): Pause | null => (isObj(p) && dayKey(p.from, '') && dayKey(p.to, '') ? { from: p.from, to: p.to, why: p.why === 'away' || p.why === 'rest' ? p.why : 'sick' } : null);
const cleanBoss = (b: any): BossRecord | null => (isObj(b) && typeof b.id === 'string' ? { id: b.id, name: str(b.name, b.id), start: dayKey(b.start, ''), end: b.end ? dayKey(b.end, '') || null : null, won: !!b.won } : null);

/**
 * v3 -> v4: everything a v3 save had is kept as it was. The new parts are rebuilt as
 * well as the old save allows: per-day history and lifetime counters from the Hearthmind
 * log and the chronicle, foes beaten from the chronicle, and every familiar you own
 * starts at Grown (so its gift is exactly what it was).
 */
function upgradeToV4(s: Save, now: number) {
  const dailies = new Set(s.oaths.filter((o) => o.kind === 'daily').map((o) => o.id));
  const log = s.mind.log;
  // history
  for (const e of log) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.day))) continue;
    const h = s.history[e.day] || (s.history[e.day] = { due: 0, kept: 0, keeps: 0, xp: 0, gold: 0, focus: 0 });
    if (e.kind === 'keep') { h.keeps++; if (dailies.has(e.oath)) { h.kept++; h.due++; } }
    else if (e.kind === 'miss' || e.kind === 'forgiven') h.due++;
  }
  const today = hearthDay(now, s.settings.dayStart);
  delete s.history[today]; // today is still being played; it is counted live from here on
  for (const v of Object.values(s.history)) if (v.due > 0 && v.kept >= v.due) v.perfect = true;
  // lifetime counters
  const st = s.stats;
  const chron = (re: RegExp) => s.chronicle.filter((c) => re.test(c.text)).length;
  st.dailyKeeps = log.filter((e) => e.kind === 'keep' && dailies.has(e.oath)).length;
  st.todos = chron(/^Finished the errand/);
  st.habitUps = chron(/^Did "/);
  st.perfectDays = Object.values(s.history).filter((v) => v.perfect).length;
  st.rewardsBought = s.rewards.reduce((a, x) => a + x.bought, 0);
  st.forged = chron(/^Forged:/);
  st.rekindles = chron(/^Rekindled "/);
  st.rites = chron(/^Finished a \d+-minute focus rite/) || Math.floor(st.focusMinutes / 25);
  st.earlyKeeps = log.filter((e) => e.kind === 'keep' && e.hour >= 4 && e.hour < 8).length;
  for (const e of log) if (e.kind === 'keep' && STATS.includes(e.stat)) st.statKeeps[e.stat]++;
  let xpTotal = s.hero.xp;
  for (let l = 1; l < s.hero.level; l++) xpTotal += xpToNext(l);
  st.xpTotal = xpTotal;
  const goldSeen = s.chronicle.reduce((a, c) => a + [...c.text.matchAll(/\+(\d+) gold/g)].reduce((b, m) => b + Number(m[1]), 0), 0);
  st.goldTotal = Math.max(s.hero.gold, goldSeen);
  // foes beaten, from the chronicle (oldest first)
  for (const c of [...s.chronicle].reverse()) {
    const m = /^Defeated (.+?)! /.exec(c.text);
    if (m) { const d = hearthDay(c.t, s.settings.dayStart); s.bossLog.push({ id: BOSSES.find((b) => b.name === m[1])?.id || m[1], name: m[1], start: d, end: d, won: true }); }
  }
  if (s.quest) s.bossLog.push({ id: s.quest.boss, name: bossById(s.quest.boss)?.name || s.quest.boss, start: s.quest.startedDay, end: null, won: false });
  // familiars: everyone you already had is Grown; the one at your heel already knows you a little
  for (const f of s.hero.familiars) s.bonds[f] = 10;
  s.bonds[s.hero.familiar] = 10 + Math.min(st.keeps, 49);
}

/** v1 saves (the first build) kept tasks in `tasks` with `type`, and the hero's vitality as `vitality`. */
function fromV1(raw: any): any {
  const h = isObj(raw.hero) ? raw.hero : {};
  return {
    ...raw,
    version: 2,
    hero: { ...h, hp: h.hp ?? h.vitality, look: h.look ?? { sex: h.body === 'man' ? 'male' : 'female', skin: 'light', hair: 'plain', hairColor: 'chestnut' } },
    oaths: (raw.oaths ?? raw.tasks ?? []).map((t: any) => ({ ...t, kind: t.kind ?? (t.type === 'errand' ? 'todo' : t.type) })),
  };
}

/** Accepts anything; returns a complete, valid Save or throws if it is not a Hearthbound save at all. */
export function migrate(raw: unknown, now = Date.now()): Save {
  if (isObj(raw) && raw.app === 'hearthbound' && isObj(raw.save)) raw = raw.save; // export envelope
  if (!isObj(raw) || !isObj(raw.hero)) throw new Error('This is not a Hearthbound save.');
  let r: any = raw;
  if (num(r.version, 1) < 2) r = fromV1(r);
  const h = r.hero;
  const look = isObj(h.look) ? h.look : {};
  const today = hearthDay(now, num(r.settings?.dayStart, 4, 0, 11));
  const ownedGear = arr(h.gear, (g) => (typeof g === 'string' && GEAR.some((x) => x.id === g) ? g : null));
  const equipped: Partial<Record<Slot, string>> = {};
  if (isObj(h.equipped)) for (const [slot, id] of Object.entries(h.equipped)) {
    const g = typeof id === 'string' ? gearById(id) : undefined;
    if (g && g.slot === slot) { equipped[g.slot] = g.id; if (!ownedGear.includes(g.id)) ownedGear.push(g.id); }
  }
  // the body must always be dressed
  for (const [slot, id] of [['torso', 'tunic_linen'], ['legs', 'trousers_brown'], ['feet', 'shoes']] as [Slot, string][]) {
    if (!equipped[slot]) { equipped[slot] = id; if (!ownedGear.includes(id)) ownedGear.push(id); }
  }
  const familiars = arr(h.familiars, (f) => (typeof f === 'string' && FAMILIARS.some((x) => x.id === f) ? f : null));
  if (!familiars.includes('soot')) familiars.unshift('soot');
  const familiar = typeof h.familiar === 'string' && familiars.includes(h.familiar) ? h.familiar : 'soot';
  const statXp = isObj(h.statXp) ? h.statXp : {};
  const s: Save = {
    version: SAVE_VERSION,
    createdAt: num(r.createdAt, now),
    hero: {
      name: str(h.name, 'Wanderer').slice(0, 24) || 'Wanderer',
      calling: CALLINGS.some((c) => c.id === h.calling) ? h.calling : 'warden',
      look: {
        sex: look.sex === 'male' ? 'male' : 'female', skin: str(look.skin, 'light'), hair: str(look.hair, 'plain'), hairColor: str(look.hairColor, 'chestnut'),
      },
      level: Math.floor(num(h.level, 1, 1, 999)), xp: num(h.xp, 0, 0), hp: num(h.hp, 50), gold: Math.floor(num(h.gold, 0, 0)), mana: num(h.mana, 0, 0),
      embers: Math.floor(num(h.embers, 1, 0, 3)), skillPoints: Math.floor(num(h.skillPoints, 0, 0)),
      perks: arr(h.perks, (p) => (typeof p === 'string' ? p : null)),
      statXp: { might: num(statXp.might, 0, 0), wit: num(statXp.wit, 0, 0), grit: num(statXp.grit, 0, 0), craft: num(statXp.craft, 0, 0) },
      titles: arr(h.titles, (t) => (typeof t === 'string' ? t : null)), title: typeof h.title === 'string' ? h.title : null,
      familiar, familiars, gear: ownedGear, equipped,
    },
    oaths: arr(r.oaths, (o) => cleanOath(o, now)),
    rewards: arr(r.rewards, (x) => (isObj(x) && typeof x.title === 'string' ? { id: str(x.id, uid()), title: x.title, cost: Math.max(1, Math.round(num(x.cost, 10))), bought: num(x.bought, 0, 0) } : null)),
    materials: { iron: 0, herb: 0, thread: 0, ink: 0, ember: 0, gel: 0, ...(isObj(r.materials) ? Object.fromEntries(Object.entries(r.materials).map(([k, v]) => [k, num(v, 0, 0)])) : {}) },
    quest: isObj(r.quest) && typeof r.quest.boss === 'string' ? { boss: r.quest.boss, hp: num(r.quest.hp, 1, 0), max: num(r.quest.max, 80, 1), startedDay: dayKey(r.quest.startedDay, today) } : null,
    defeated: arr(r.defeated, (d) => (typeof d === 'string' ? d : null)),
    focus: isObj(r.focus) && typeof r.focus.startedAt === 'number' ? { startedAt: r.focus.startedAt, minutes: num(r.focus.minutes, 25, 1, 180) } : null,
    day: isObj(r.day) ? { key: dayKey(r.day.key, today), omen: str(r.day.omen, ''), combo: num(r.day.combo, 0, 0), lastKeepAt: num(r.day.lastKeepAt, 0), rested: !!r.day.rested, gifted: !!r.day.gifted } : { key: today, omen: omenFor(today).id, combo: 0, lastKeepAt: 0, rested: false, gifted: false },
    lastDay: dayKey(r.lastDay, today),
    dawn: isObj(r.dawn) ? (r.dawn as any) : null,
    chronicle: arr(r.chronicle, (c) => (isObj(c) && typeof c.text === 'string' ? { t: num(c.t, now), text: c.text, kind: str(c.kind, 'life') as any } : null)).slice(0, 300),
    mind: { log: arr(r.mind?.log, (e) => (isObj(e) && typeof e.oath === 'string' ? (e as any) : null)), dismissed: isObj(r.mind?.dismissed) ? r.mind.dismissed : {}, accepted: num(r.mind?.accepted, 0, 0) },
    settings: {
      dayStart: num(r.settings?.dayStart, 4, 0, 11), sound: r.settings?.sound !== false, location: str(r.settings?.location, 'inn'),
      reminder: { on: !!r.settings?.reminder?.on, time: timeStr(r.settings?.reminder?.time, '19:00') },
      noPenalty: r.mode === 'kid' ? true : !!r.settings?.noPenalty,
    },
    weekly: isObj(r.weekly) ? { week: str(r.weekly.week, ''), mercyUsed: !!r.weekly.mercyUsed, coalsGiven: !!r.weekly.coalsGiven } : { week: '', mercyUsed: false, coalsGiven: false },
    stats: cleanStats(r.stats),
    mode: MODES.includes(r.mode) ? r.mode : 'standard',
    bonds: isObj(r.bonds) ? Object.fromEntries(Object.entries(r.bonds).filter(([k]) => FAMILIARS.some((f) => f.id === k)).map(([k, v]) => [k, num(v, 0, 0)])) : {},
    story: isObj(r.story) ? { chapter: Math.floor(num(r.story.chapter, 1, 1, 99)), base: isObj(r.story.base) ? Object.fromEntries(Object.entries(r.story.base).map(([k, v]) => [k, num(v, 0, 0)])) : null, claimed: arr(r.story.claimed, (x) => (Number.isInteger(x) ? x : null)) } : { chapter: 1, base: null, claimed: [] },
    season: isObj(r.season) && typeof r.season.id === 'string' && /^\d{4}-\d{2}$/.test(r.season.id) ? { id: r.season.id, sparks: num(r.season.sparks, 0, 0), got: arr(r.season.got, (x) => (Number.isInteger(x) ? x : null)) } : { id: seasonIdOf(today), sparks: 0, got: [] },
    achievements: isObj(r.achievements) ? Object.fromEntries(Object.entries(r.achievements).map(([k, v]) => [k, num(v, now)])) : {},
    history: cleanHistory(r.history),
    bossLog: arr(r.bossLog, cleanBoss),
    chores: arr(r.chores, cleanChore),
    pauses: arr(r.pauses, cleanPause),
    reportSeen: dayKey(r.reportSeen, ''),
  };
  if (isObj(r.day)) { if (r.day.patted) s.day.patted = true; if (r.day.perfect) s.day.perfect = true; }
  const fromVersion = num(r.version, 1);
  if (fromVersion < 4) {
    upgradeToV4(s, now);
  }
  // v3 changed the level curve (early levels are shorter): any XP already past
  // the new bar becomes the levels (and skill points) it is now worth.
  gainXp(s, 0, now);
  s.hero.hp = Math.min(maxHp(s), Math.max(1, s.hero.hp));
  s.hero.mana = Math.min(maxMana(s), s.hero.mana);
  if (fromVersion < 4) checkBadges(s, now, true); // badges an old saga already earned, quietly
  syncStory(s);
  return s;
}

// ---------------------------------------------------------------- storage
export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }

/** Writes the save; the copy it replaces becomes the backup, so one bad write never leaves you with nothing. */
export function persist(st: Store, s: Save, key = KEY) {
  const prev = st.getItem(key);
  if (prev) {
    try { migrate(JSON.parse(prev)); st.setItem(key + '.backup', prev); } catch { /* keep the older good backup */ }
  }
  st.setItem(key, JSON.stringify(s));
}

export function load(st: Store, now = Date.now(), key = KEY): { save: Save | null; from: 'live' | 'backup' | 'none'; error?: string } {
  const bk = key + '.backup';
  const live = st.getItem(key);
  if (live) {
    try { return { save: migrate(JSON.parse(live), now), from: 'live' }; } catch (e) {
      const b = st.getItem(bk);
      if (b) try { return { save: migrate(JSON.parse(b), now), from: 'backup', error: String(e) }; } catch { /* fall through */ }
      return { save: null, from: 'none', error: String(e) };
    }
  }
  const b = st.getItem(bk);
  if (b) try { return { save: migrate(JSON.parse(b), now), from: 'backup' }; } catch { /* nothing */ }
  return { save: null, from: 'none' };
}

export function exportSave(s: Save, now = Date.now()) {
  return JSON.stringify({ app: 'hearthbound', version: SAVE_VERSION, exportedAt: new Date(now).toISOString(), save: s }, null, 1);
}

export interface FamilyEntry { id: string; name: string; mode: HeroMode; save: Save; }
/** One file with every hero on this device. */
export function exportFamily(heroes: FamilyEntry[], now = Date.now()) {
  return JSON.stringify({ app: 'hearthbound', kind: 'family', version: SAVE_VERSION, exportedAt: new Date(now).toISOString(), heroes }, null, 1);
}

export type Bundle = { kind: 'hero'; save: Save } | { kind: 'family'; heroes: FamilyEntry[] };
/** Reads either a one-hero backup (any version) or a family backup. */
export function importBundle(text: string, now = Date.now()): Bundle {
  let raw: any;
  try { raw = JSON.parse(text); } catch { throw new Error('That file is not readable JSON.'); }
  if (raw && raw.kind === 'family' && Array.isArray(raw.heroes)) {
    const heroes: FamilyEntry[] = [];
    for (const h of raw.heroes) {
      if (!h || typeof h.id !== 'string' || !/^[a-z0-9]{1,24}$/.test(h.id)) continue;
      const save = migrate(h.save, now);
      heroes.push({ id: h.id, name: save.hero.name, mode: save.mode, save });
    }
    if (!heroes.length) throw new Error('That family backup has no heroes in it.');
    return { kind: 'family', heroes };
  }
  return { kind: 'hero', save: migrate(raw, now) };
}

export function importSave(text: string, now = Date.now()): Save {
  const b = importBundle(text, now);
  if (b.kind === 'family') return b.heroes[0].save;
  return b.save;
}
