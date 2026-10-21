import {
  BASE_MODS, BOSSES, CALLINGS, DIFF, FAMILIARS, GEAR, KINDLE_COST, MAX_EMBERS, OMENS, PERKS, RECIPES,
  REST_COST, REST_HEAL, STAT_IDS, STAT_MATERIAL, familiarById, gearById, type Mods, type Omen,
} from './content';
import { addDays, dayDiff, daysBetween, dowOf, hashStr, hearthDay, weekOf, type DayKey } from './time';
import type { ChronicleEntry, DawnReport, Difficulty, Material, Oath, OathKind, Save, Stat } from './types';

export type Rng = () => number;

// ---------------------------------------------------------------- basics
export const xpToNext = (level: number) => 60 + (level - 1) * 30;
export const statRank = (xp: number) => Math.floor(Math.sqrt(xp / 3));
export const maxMana = (s: Save) => 30 + 4 * s.hero.level;
export function maxHp(s: Save) { return 50 + Math.round(mods(s, false).maxHp); }

export function omenFor(day: DayKey): Omen { return OMENS[hashStr('omen:' + day) % OMENS.length]; }

function addMods(into: Mods, m: Partial<Mods> | undefined, scale = 1) {
  if (!m) return;
  for (const k of Object.keys(m) as (keyof Mods)[]) {
    if (k === 'omenScale' || k === 'comboCap') into[k] = Math.max(into[k], m[k]!);
    else into[k] += m[k]! * scale;
  }
}

/** Every modifier in play: calling, perks, familiar, worn gear, stat ranks and (optionally) today's omen. */
export function mods(s: Save, withOmen = true): Mods {
  const m: Mods = { ...BASE_MODS };
  addMods(m, CALLINGS.find((c) => c.id === s.hero.calling)?.mods);
  for (const p of s.hero.perks) addMods(m, PERKS.find((x) => x.id === p)?.mods);
  addMods(m, familiarById(s.hero.familiar)?.mods);
  for (const id of Object.values(s.hero.equipped)) if (id) addMods(m, gearById(id)?.bonus);
  const r = (st: Stat) => statRank(s.hero.statXp[st] || 0);
  m.strike += 0.02 * r('might');
  m.xp += 0.01 * r('wit');
  m.missCut += Math.min(0.3, 0.015 * r('grit'));
  m.gold += 0.01 * r('craft');
  if (withOmen) addMods(m, omenFor(s.day.key).mods, m.omenScale);
  m.missCut = Math.min(0.75, m.missCut);
  return m;
}

export function chronicle(s: Save, text: string, kind: ChronicleEntry['kind'], t = Date.now()) {
  s.chronicle.unshift({ t, text, kind });
  if (s.chronicle.length > 300) s.chronicle.length = 300;
}

function award(s: Save, title: string, now: number) {
  if (!s.hero.titles.includes(title)) {
    s.hero.titles.push(title);
    if (!s.hero.title) s.hero.title = title;
    chronicle(s, `Earned the title "${title}".`, 'life', now);
    return true;
  }
  return false;
}

let uidSeq = 0;
export function uid(rng: Rng = Math.random) {
  uidSeq = (uidSeq + 1) % 1679616;
  return Date.now().toString(36) + uidSeq.toString(36).padStart(4, '0') + Math.floor(rng() * 1e6).toString(36);
}

// ---------------------------------------------------------------- oaths
export interface OathInput { kind: OathKind; title: string; notes?: string; difficulty: Difficulty; stat: Stat; days?: number[]; up?: boolean; down?: boolean; }

export function validateOath(o: OathInput): string | null {
  if (!o.title.trim()) return 'Give the oath a name.';
  if (o.title.trim().length > 80) return 'Keep the name under 80 characters.';
  if (o.kind === 'daily' && (!o.days || o.days.length === 0)) return 'Pick at least one day.';
  if (o.kind === 'habit' && !o.up && !o.down) return 'A habit needs a + or a − side.';
  return null;
}

export function addOath(s: Save, o: OathInput, now: number, rng: Rng = Math.random): Oath {
  const err = validateOath(o);
  if (err) throw new Error(err);
  const oath: Oath = {
    id: uid(rng), kind: o.kind, title: o.title.trim(), notes: (o.notes || '').trim(), difficulty: o.difficulty, stat: o.stat,
    days: o.kind === 'daily' ? [...new Set(o.days!)].sort() : [], streak: 0, bestStreak: 0, doneDay: null,
    up: o.kind === 'habit' ? !!o.up : false, down: o.kind === 'habit' ? !!o.down : false, ups: 0, downs: 0,
    done: false, doneAt: null, createdAt: now, createdDay: hearthDay(now, s.settings.dayStart),
  };
  s.oaths.push(oath);
  return oath;
}

export function editOath(s: Save, id: string, o: OathInput) {
  const err = validateOath(o);
  if (err) throw new Error(err);
  const t = s.oaths.find((x) => x.id === id);
  if (!t) throw new Error('That oath is gone.');
  t.title = o.title.trim(); t.notes = (o.notes || '').trim(); t.difficulty = o.difficulty; t.stat = o.stat;
  if (t.kind === 'daily') t.days = [...new Set(o.days!)].sort();
  if (t.kind === 'habit') { t.up = !!o.up; t.down = !!o.down; }
}

export function deleteOath(s: Save, id: string) { s.oaths = s.oaths.filter((x) => x.id !== id); }

export const isDueOn = (o: Oath, day: DayKey) => o.kind === 'daily' && o.days.includes(dowOf(day));
export const today = (s: Save, now: number) => hearthDay(now, s.settings.dayStart);

/** The first daily still due today, in list order. */
export function nextOath(s: Save, now: number): Oath | null {
  const d = today(s, now);
  return s.oaths.find((o) => isDueOn(o, d) && o.doneDay !== d) || null;
}

// ---------------------------------------------------------------- rewards
export interface Payout { xp: number; gold: number; mana: number; strike: number; combo: number; bright: boolean; drop: Material | null; streak: number; }

function comboAfter(s: Save, now: number, m: Mods) {
  const within = s.day.lastKeepAt && now - s.day.lastKeepAt <= m.comboWindow * 60000;
  return within ? Math.min(s.day.combo + 1, m.comboCap) : 1;
}

/** What a keep would pay right now, without luck (bright keeps and drops). */
export function preview(s: Save, o: Oath, now: number): Payout {
  const m = mods(s);
  const base = DIFF[o.difficulty];
  const combo = comboAfter(s, now, m);
  const streak = o.kind === 'daily' ? o.streak + 1 : 0;
  const streakBonus = Math.min(streak, 20) * 0.025;
  const comboMult = 1 + 0.1 * (combo - 1);
  const xp = Math.round(base.xp * (1 + m.xp) * (1 + streakBonus) * comboMult);
  const gold = Math.max(base.gold, Math.round(base.gold * (1 + m.gold) * (1 + streakBonus) * comboMult));
  const mana = Math.max(1, Math.round(base.mana * (1 + m.mana)));
  const strike = s.quest ? Math.max(1, Math.round(base.strike * (1 + m.strike) * comboMult)) : 0;
  return { xp, gold, mana, strike, combo, bright: false, drop: null, streak };
}

function rollPayout(s: Save, o: Oath, now: number, rng: Rng): Payout {
  const p = preview(s, o, now);
  const m = mods(s);
  if (rng() < m.crit) { p.bright = true; p.xp = Math.round(p.xp * 1.5); p.gold = Math.round(p.gold * 1.5); p.strike = Math.round(p.strike * 1.5); }
  if (rng() < 0.2 * (1 + m.drop)) p.drop = rng() < 0.15 ? 'ember' : STAT_MATERIAL[o.stat];
  return p;
}

export interface KeepResult { payout: Payout; levelsGained: number; bossDown: string | null; titles: string[]; }

function applyPayout(s: Save, o: Oath, p: Payout, now: number, rng: Rng): KeepResult {
  const h = s.hero;
  h.gold += p.gold;
  h.mana = Math.min(maxMana(s), h.mana + p.mana);
  h.statXp[o.stat] = (h.statXp[o.stat] || 0) + 1 + (o.difficulty === 'hard' ? 2 : o.difficulty === 'medium' ? 1 : 0);
  if (p.drop) s.materials[p.drop] = (s.materials[p.drop] || 0) + 1;
  s.day.combo = p.combo; s.day.lastKeepAt = now;
  s.stats.keeps++;
  const titles: string[] = [];
  if (s.stats.keeps === 1 && award(s, 'Kindler', now)) titles.push('Kindler');
  if (p.streak >= 7 && award(s, 'Seven Nights', now)) titles.push('Seven Nights');
  if (p.streak >= 30 && award(s, 'Hearth-true', now)) titles.push('Hearth-true');
  const levelsGained = gainXp(s, p.xp, now);
  let bossDown: string | null = null;
  if (s.quest && p.strike) bossDown = strikeBoss(s, p.strike, now);
  const d = new Date(now);
  s.mind.log.push({ t: now, day: today(s, now), oath: o.id, kind: 'keep', stat: o.stat, hour: d.getHours() });
  trimMind(s);
  void rng;
  return { payout: p, levelsGained, bossDown, titles };
}

export function gainXp(s: Save, xp: number, now: number): number {
  const h = s.hero;
  h.xp += xp;
  let gained = 0;
  while (h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level++; gained++;
    h.skillPoints++;
    h.hp = maxHp(s);
    h.mana = maxMana(s);
    chronicle(s, `Reached level ${h.level}. A skill point is waiting.`, 'level', now);
    if (h.level === 5) award(s, 'Hearthwarden', now);
    if (h.level === 10) award(s, 'Lantern-bearer', now);
  }
  return gained;
}

export function keepDaily(s: Save, id: string, now: number, rng: Rng = Math.random): KeepResult {
  const o = s.oaths.find((x) => x.id === id);
  if (!o || o.kind !== 'daily') throw new Error('No such daily.');
  const d = today(s, now);
  if (!isDueOn(o, d)) throw new Error('Not due today.');
  if (o.doneDay === d) throw new Error('Already kept today.');
  const p = rollPayout(s, o, now, rng);
  o.doneDay = d;
  o.streak += 1;
  o.bestStreak = Math.max(o.bestStreak, o.streak);
  const r = applyPayout(s, o, p, now, rng);
  chronicle(s, `Kept "${o.title}" (+${p.gold} gold, +${p.xp} XP${p.combo > 1 ? `, combo x${p.combo}` : ''}).`, 'keep', now);
  return r;
}

/** Undo a keep made earlier today: takes back what it paid. */
export function unkeepDaily(s: Save, id: string, now: number) {
  const o = s.oaths.find((x) => x.id === id);
  const d = today(s, now);
  if (!o || o.doneDay !== d) return;
  o.doneDay = null; o.streak = Math.max(0, o.streak - 1);
}

export function tapHabit(s: Save, id: string, dir: 1 | -1, now: number, rng: Rng = Math.random): KeepResult | { hurt: number; fell: boolean } {
  const o = s.oaths.find((x) => x.id === id);
  if (!o || o.kind !== 'habit') throw new Error('No such habit.');
  if (dir === 1) {
    if (!o.up) throw new Error('This habit has no + side.');
    const p = rollPayout(s, o, now, rng);
    o.ups++;
    const r = applyPayout(s, o, p, now, rng);
    chronicle(s, `Did "${o.title}" (+${p.gold} gold, +${p.xp} XP).`, 'keep', now);
    return r;
  }
  if (!o.down) throw new Error('This habit has no − side.');
  o.downs++;
  const m = mods(s);
  const hurt = Math.max(1, Math.round(DIFF[o.difficulty].hurt * 0.5 * (1 - m.missCut)));
  s.stats.slips++;
  s.mind.log.push({ t: now, day: today(s, now), oath: o.id, kind: 'slip', stat: o.stat, hour: new Date(now).getHours() });
  trimMind(s);
  chronicle(s, `Slipped on "${o.title}" (−${hurt} vitality).`, 'miss', now);
  const fell = hurtHero(s, hurt, now);
  return { hurt, fell };
}

export function completeTodo(s: Save, id: string, now: number, rng: Rng = Math.random): KeepResult {
  const o = s.oaths.find((x) => x.id === id);
  if (!o || o.kind !== 'todo') throw new Error('No such errand.');
  if (o.done) throw new Error('Already done.');
  const p = rollPayout(s, o, now, rng);
  o.done = true; o.doneAt = now;
  const r = applyPayout(s, o, p, now, rng);
  chronicle(s, `Finished the errand "${o.title}" (+${p.gold} gold).`, 'keep', now);
  return r;
}

/** Vitality loss. Returns true if the hero fell (and has been set back on their feet). */
export function hurtHero(s: Save, amount: number, now: number): boolean {
  s.hero.hp -= amount;
  if (s.hero.hp > 0) return false;
  const lost = Math.floor(s.hero.gold * 0.1);
  s.hero.gold -= lost;
  s.hero.xp = 0;
  s.hero.hp = maxHp(s);
  chronicle(s, `Ran out of vitality. Woke by the hearth, rested, minus ${lost} gold and this level's progress.`, 'miss', now);
  return true;
}

// ---------------------------------------------------------------- bosses
export function canInvite(s: Save, bossId: string): string | null {
  const b = BOSSES.find((x) => x.id === bossId);
  if (!b) return 'Unknown foe.';
  if (s.quest) return 'You are already on a quest.';
  if (b.needs && !s.defeated.includes(b.needs)) return `Defeat ${BOSSES.find((x) => x.id === b.needs)!.name} first.`;
  return null;
}

export function inviteBoss(s: Save, bossId: string, now: number) {
  const err = canInvite(s, bossId);
  if (err) throw new Error(err);
  const b = BOSSES.find((x) => x.id === bossId)!;
  s.quest = { boss: b.id, hp: b.hp, max: b.hp, startedDay: today(s, now) };
  s.settings.location = b.location;
  chronicle(s, `Set out after ${b.name}.`, 'boss', now);
}

export function abandonQuest(s: Save, now: number) {
  if (!s.quest) return;
  const b = BOSSES.find((x) => x.id === s.quest!.boss)!;
  chronicle(s, `Turned back from ${b.name}. It will wait.`, 'boss', now);
  s.quest = null;
}

export function strikeBoss(s: Save, dmg: number, now: number): string | null {
  if (!s.quest) return null;
  s.quest.hp = Math.max(0, s.quest.hp - dmg);
  if (s.quest.hp > 0) return null;
  const b = BOSSES.find((x) => x.id === s.quest!.boss)!;
  s.quest = null;
  if (!s.defeated.includes(b.id)) s.defeated.push(b.id);
  s.stats.bossesDown++;
  s.hero.gold += b.gold;
  s.materials[b.drop[0]] = (s.materials[b.drop[0]] || 0) + b.drop[1];
  chronicle(s, `Defeated ${b.name}! +${b.gold} gold, +${b.xp} XP, ${b.drop[1]} ${b.drop[0]}.`, 'boss', now);
  award(s, b.title, now);
  gainXp(s, b.xp, now);
  return b.id;
}

// ---------------------------------------------------------------- the day turn
/**
 * Runs every night that has ended since the last visit. Missed dailies cost
 * vitality and break streaks unless an ember token (or Mercy) covers them.
 * Vitality is only taken for the last three nights, so a long absence does not
 * turn into a wipe-out.
 */
export function dayTurn(s: Save, now: number): DawnReport | null {
  const t = today(s, now);
  if (!s.lastDay) { s.lastDay = t; resetDay(s, t); return null; }
  if (s.lastDay >= t) return null;
  const nights = daysBetween(s.lastDay, t);
  const boss = s.quest ? BOSSES.find((b) => b.id === s.quest!.boss)! : null;
  const rep: DawnReport = {
    day: t, nights: nights.length, missed: [], forgiven: [], streaksBroken: [], hpLost: 0, bossHits: 0,
    bossName: boss?.name ?? null, gifts: [], fell: false, goldLost: 0, omen: omenFor(t).id, keptYesterday: 0,
  };
  const m = mods(s, false);
  const last = nights[nights.length - 1];
  for (const d of nights) {
    const counts = dayDiff(d, t) <= 3; // only the last 3 nights cost vitality
    const omen = omenFor(d);
    const omenM = mods({ ...s, day: { ...s.day, key: d } });
    for (const o of s.oaths) {
      if (!isDueOn(o, d) || o.createdDay > d) continue;
      if (o.doneDay === d) { if (d === last) rep.keptYesterday++; continue; }
      const evt = { t: now, day: d, oath: o.id, stat: o.stat, hour: -1 };
      // weekly perks reset
      const wk = weekOf(d);
      if (s.weekly.week !== wk) s.weekly = { week: wk, mercyUsed: false, coalsGiven: false };
      if (s.hero.embers > 0) {
        s.hero.embers--; rep.forgiven.push({ title: o.title, by: 'ember' });
        s.mind.log.push({ ...evt, kind: 'forgiven' });
        continue;
      }
      if (s.hero.perks.includes('mercy') && !s.weekly.mercyUsed) {
        s.weekly.mercyUsed = true; rep.forgiven.push({ title: o.title, by: 'mercy' });
        s.mind.log.push({ ...evt, kind: 'forgiven' });
        continue;
      }
      if (o.streak > 0) rep.streaksBroken.push({ title: o.title, was: o.streak });
      o.streak = 0;
      s.stats.misses++;
      s.mind.log.push({ ...evt, kind: 'miss' });
      let hp = 0;
      if (counts) {
        hp = Math.max(1, Math.round(DIFF[o.difficulty].hurt * (1 - m.missCut) * (omen.missHalf ? (omenM.omenScale > 1 ? 0.25 : 0.5) : 1)));
        if (boss) { rep.bossHits += boss.power; }
      }
      rep.hpLost += hp;
      rep.missed.push({ title: o.title, hp });
    }
  }
  trimMind(s);
  // Monday embers (Banked Coals)
  const wkNow = weekOf(t);
  if (s.weekly.week !== wkNow) s.weekly = { week: wkNow, mercyUsed: false, coalsGiven: false };
  if (s.hero.perks.includes('banked_coals') && !s.weekly.coalsGiven && nights.some((d) => weekOf(addDays(d, 1)) === wkNow)) {
    s.weekly.coalsGiven = true;
    if (s.hero.embers < MAX_EMBERS) { s.hero.embers++; rep.gifts.push('Banked Coals gave you an ember token.'); }
  }
  const total = rep.hpLost + rep.bossHits;
  const goldBefore = s.hero.gold;
  if (total > 0) rep.fell = hurtHero(s, total, now);
  rep.goldLost = goldBefore - s.hero.gold;
  const fam = familiarById(s.hero.familiar);
  if (fam?.dawnHeal && !rep.fell) {
    const before = s.hero.hp;
    s.hero.hp = Math.min(maxHp(s), s.hero.hp + fam.dawnHeal);
    if (s.hero.hp > before) rep.gifts.push(`${fam.name} curled up by you and restored ${s.hero.hp - before} vitality.`);
  }
  if (rep.missed.length) chronicle(s, `Dawn: ${rep.missed.length} missed, −${total} vitality.`, 'miss', now);
  for (const o of s.oaths) if (o.kind === 'habit') { o.ups = 0; o.downs = 0; }
  // errands done more than a week ago are cleared away
  s.oaths = s.oaths.filter((o) => !(o.kind === 'todo' && o.done && o.doneAt && now - o.doneAt > 7 * 86400000));
  s.lastDay = t;
  resetDay(s, t);
  s.dawn = rep;
  return rep;
}

function resetDay(s: Save, t: DayKey) {
  s.day = { key: t, omen: omenFor(t).id, combo: 0, lastKeepAt: 0, rested: false, gifted: false };
}

// ---------------------------------------------------------------- mana, skills
export function rest(s: Save, now: number) {
  if (s.day.rested) throw new Error('You have already rested today.');
  if (s.hero.mana < REST_COST) throw new Error(`Resting needs ${REST_COST} mana.`);
  const before = s.hero.hp;
  s.hero.mana -= REST_COST;
  s.hero.hp = Math.min(maxHp(s), s.hero.hp + REST_HEAL);
  s.day.rested = true;
  chronicle(s, `Rested by the fire (+${s.hero.hp - before} vitality).`, 'life', now);
  return s.hero.hp - before;
}

export function kindle(s: Save, now: number) {
  if (s.hero.embers >= MAX_EMBERS) throw new Error(`You can hold ${MAX_EMBERS} ember tokens.`);
  if (s.hero.mana < KINDLE_COST) throw new Error(`Kindling needs ${KINDLE_COST} mana.`);
  s.hero.mana -= KINDLE_COST; s.hero.embers++;
  chronicle(s, 'Kindled an ember token from mana.', 'life', now);
}

export function canLearn(s: Save, perkId: string): string | null {
  const p = PERKS.find((x) => x.id === perkId);
  if (!p) return 'Unknown perk.';
  if (s.hero.perks.includes(p.id)) return 'Already learned.';
  if (s.hero.skillPoints < 1) return 'No skill points. Level up to earn one.';
  const prev = PERKS.find((x) => x.branch === p.branch && x.tier === p.tier - 1);
  if (prev && !s.hero.perks.includes(prev.id)) return `Learn ${prev.name} first.`;
  return null;
}

export function learnPerk(s: Save, perkId: string, now: number) {
  const err = canLearn(s, perkId);
  if (err) throw new Error(err);
  s.hero.perks.push(perkId); s.hero.skillPoints--;
  chronicle(s, `Learned ${PERKS.find((x) => x.id === perkId)!.name}.`, 'level', now);
}

// ---------------------------------------------------------------- market & forge
export const priceOf = (s: Save, base: number) => Math.round(base * (1 - mods(s, false).price));

export function buyGear(s: Save, id: string, now: number) {
  const g = gearById(id);
  if (!g || g.source !== 'market') throw new Error('Not for sale.');
  if (s.hero.gear.includes(id)) throw new Error('Already yours.');
  const cost = priceOf(s, g.price);
  if (s.hero.gold < cost) throw new Error(`Needs ${cost - s.hero.gold} more gold.`);
  s.hero.gold -= cost; s.hero.gear.push(id);
  s.hero.equipped[g.slot] = id;
  chronicle(s, `Bought the ${g.name} for ${cost} gold.`, 'buy', now);
}

export function equip(s: Save, id: string | null, slot: keyof Save['hero']['equipped']) {
  if (id === null) {
    if (slot === 'torso' || slot === 'legs' || slot === 'feet') throw new Error('That slot cannot be empty.');
    delete s.hero.equipped[slot]; return;
  }
  const g = gearById(id);
  if (!g || !s.hero.gear.includes(id)) throw new Error('You do not own that.');
  s.hero.equipped[g.slot] = id;
}

export function buyFamiliar(s: Save, id: string, now: number) {
  const f = familiarById(id);
  if (!f) throw new Error('Unknown familiar.');
  if (s.hero.familiars.includes(id)) throw new Error('Already with you.');
  const cost = priceOf(s, f.price);
  if (s.hero.gold < cost) throw new Error(`Needs ${cost - s.hero.gold} more gold.`);
  s.hero.gold -= cost; s.hero.familiars.push(id); s.hero.familiar = id;
  chronicle(s, `${f.name}, ${f.kind}, joined you.`, 'buy', now);
}

export function callFamiliar(s: Save, id: string) {
  if (!s.hero.familiars.includes(id)) throw new Error('Not yet yours.');
  s.hero.familiar = id;
}

export function addReward(s: Save, title: string, cost: number, rng: Rng = Math.random) {
  if (!title.trim()) throw new Error('Name the reward.');
  if (!Number.isFinite(cost) || cost < 1 || cost > 100000) throw new Error('Price it between 1 and 100000 gold.');
  const r = { id: uid(rng), title: title.trim(), cost: Math.round(cost), bought: 0 };
  s.rewards.push(r);
  return r;
}

export function buyReward(s: Save, id: string, now: number) {
  const r = s.rewards.find((x) => x.id === id);
  if (!r) throw new Error('No such reward.');
  if (s.hero.gold < r.cost) throw new Error(`Needs ${r.cost - s.hero.gold} more gold.`);
  s.hero.gold -= r.cost; r.bought++;
  chronicle(s, `Treated yourself: ${r.title} (${r.cost} gold). Enjoy it.`, 'buy', now);
}

export function recipeNeeds(s: Save, recipeId: string) {
  const r = RECIPES.find((x) => x.id === recipeId)!;
  const cut = mods(s, false).forgeDiscount;
  const out: Partial<Record<Material, number>> = {};
  for (const [k, v] of Object.entries(r.needs) as [Material, number][]) out[k] = Math.max(1, v - cut);
  return out;
}

export function canForge(s: Save, recipeId: string): string | null {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) return 'Unknown recipe.';
  if (r.makes.gear && s.hero.gear.includes(r.makes.gear)) return 'Already forged.';
  if (r.makes.embers && s.hero.embers >= MAX_EMBERS) return `You can hold ${MAX_EMBERS} ember tokens.`;
  for (const [k, v] of Object.entries(recipeNeeds(s, recipeId)) as [Material, number][]) if ((s.materials[k] || 0) < v) return 'Not enough materials yet.';
  if (s.hero.gold < r.gold) return `Needs ${r.gold} gold.`;
  return null;
}

export function forge(s: Save, recipeId: string, now: number) {
  const err = canForge(s, recipeId);
  if (err) throw new Error(err);
  const r = RECIPES.find((x) => x.id === recipeId)!;
  for (const [k, v] of Object.entries(recipeNeeds(s, recipeId)) as [Material, number][]) s.materials[k] -= v;
  s.hero.gold -= r.gold;
  if (r.makes.gear) { s.hero.gear.push(r.makes.gear); s.hero.equipped[gearById(r.makes.gear)!.slot] = r.makes.gear; }
  if (r.makes.embers) s.hero.embers = Math.min(MAX_EMBERS, s.hero.embers + r.makes.embers);
  if (r.makes.heal) s.hero.hp = Math.min(maxHp(s), s.hero.hp + r.makes.heal);
  chronicle(s, `Forged: ${r.name}.`, 'forge', now);
}

// ---------------------------------------------------------------- focus rite
export const FOCUS_CHOICES = [15, 25, 45];

export function startFocus(s: Save, minutes: number, now: number) {
  if (s.focus) throw new Error('A rite is already burning.');
  if (!FOCUS_CHOICES.includes(minutes)) throw new Error('Pick 15, 25 or 45 minutes.');
  s.focus = { startedAt: now, minutes };
}

export const focusLeft = (s: Save, now: number) => (s.focus ? Math.max(0, s.focus.startedAt + s.focus.minutes * 60000 - now) : 0);

export function focusPay(s: Save, minutes: number) {
  const m = mods(s);
  return {
    xp: Math.round(minutes * 1.2 * (1 + m.xp) * (1 + m.focus)),
    gold: Math.round((minutes / 5) * (1 + m.gold) * (1 + m.focus)),
    mana: Math.round((minutes / 5) * (1 + m.mana) * (1 + m.focus)),
    strike: s.quest ? Math.round((minutes / 3) * (1 + m.strike)) : 0,
  };
}

export function finishFocus(s: Save, now: number) {
  if (!s.focus) throw new Error('No rite is burning.');
  if (focusLeft(s, now) > 0) throw new Error('The rite is still burning.');
  const min = s.focus.minutes;
  const p = focusPay(s, min);
  s.focus = null;
  s.hero.gold += p.gold;
  s.hero.mana = Math.min(maxMana(s), s.hero.mana + p.mana);
  s.hero.statXp.wit += Math.ceil(min / 15);
  s.stats.focusMinutes += min;
  chronicle(s, `Finished a ${min}-minute focus rite (+${p.xp} XP, +${p.gold} gold).`, 'focus', now);
  const levels = gainXp(s, p.xp, now);
  const bossDown = p.strike ? strikeBoss(s, p.strike, now) : null;
  return { ...p, levels, bossDown };
}

export function cancelFocus(s: Save) { s.focus = null; }

// ---------------------------------------------------------------- misc
export function trimMind(s: Save) { if (s.mind.log.length > 600) s.mind.log.splice(0, s.mind.log.length - 600); }

export const familiarsList = FAMILIARS;
export const gearList = GEAR;
export const statIds = STAT_IDS;
