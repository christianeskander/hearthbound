import { CALLINGS, FAMILIARS, GEAR, OUTFITS, REWARD_IDEAS, gearById } from './content';
import { addOath, gainXp, maxHp, maxMana, omenFor, uid } from './rules';
import { hearthDay, type DayKey } from './time';
import type { Difficulty, Look, Oath, Save, Slot, Stat } from './types';

export const SAVE_VERSION = 3;
export const KEY = 'hearthbound.save';
export const BACKUP_KEY = 'hearthbound.save.backup';

export interface NewHero { name: string; look: Look; calling: string; outfit: string; familiar: string; }

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
    settings: { dayStart: 4, sound: true, location: 'inn' },
    weekly: { week: '', mercyUsed: false, coalsGiven: false },
    stats: { keeps: 0, slips: 0, misses: 0, focusMinutes: 0, bossesDown: 0 },
  };
  s.hero.hp = maxHp(s);
  const all = [0, 1, 2, 3, 4, 5, 6];
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
  };
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
    settings: { dayStart: num(r.settings?.dayStart, 4, 0, 11), sound: r.settings?.sound !== false, location: str(r.settings?.location, 'inn') },
    weekly: isObj(r.weekly) ? { week: str(r.weekly.week, ''), mercyUsed: !!r.weekly.mercyUsed, coalsGiven: !!r.weekly.coalsGiven } : { week: '', mercyUsed: false, coalsGiven: false },
    stats: { keeps: 0, slips: 0, misses: 0, focusMinutes: 0, bossesDown: 0, ...(isObj(r.stats) ? r.stats : {}) },
  };
  // v3 changed the level curve (early levels are shorter): any XP already past
  // the new bar becomes the levels (and skill points) it is now worth.
  gainXp(s, 0, now);
  s.hero.hp = Math.min(maxHp(s), Math.max(1, s.hero.hp));
  s.hero.mana = Math.min(maxMana(s), s.hero.mana);
  return s;
}

// ---------------------------------------------------------------- storage
export interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }

/** Writes the save; the copy it replaces becomes the backup, so one bad write never leaves you with nothing. */
export function persist(st: Store, s: Save) {
  const prev = st.getItem(KEY);
  if (prev) {
    try { migrate(JSON.parse(prev)); st.setItem(BACKUP_KEY, prev); } catch { /* keep the older good backup */ }
  }
  st.setItem(KEY, JSON.stringify(s));
}

export function load(st: Store, now = Date.now()): { save: Save | null; from: 'live' | 'backup' | 'none'; error?: string } {
  const live = st.getItem(KEY);
  if (live) {
    try { return { save: migrate(JSON.parse(live), now), from: 'live' }; } catch (e) {
      const b = st.getItem(BACKUP_KEY);
      if (b) try { return { save: migrate(JSON.parse(b), now), from: 'backup', error: String(e) }; } catch { /* fall through */ }
      return { save: null, from: 'none', error: String(e) };
    }
  }
  const b = st.getItem(BACKUP_KEY);
  if (b) try { return { save: migrate(JSON.parse(b), now), from: 'backup' }; } catch { /* nothing */ }
  return { save: null, from: 'none' };
}

export function exportSave(s: Save, now = Date.now()) {
  return JSON.stringify({ app: 'hearthbound', version: SAVE_VERSION, exportedAt: new Date(now).toISOString(), save: s }, null, 1);
}

export function importSave(text: string, now = Date.now()): Save {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('That file is not readable JSON.'); }
  return migrate(raw, now);
}
