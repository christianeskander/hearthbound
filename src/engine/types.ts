import type { DayKey } from './time';

export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard';
export type Stat = 'might' | 'wit' | 'grit' | 'craft';
export type Sex = 'female' | 'male';
export type Slot = 'head' | 'torso' | 'cloak' | 'legs' | 'feet';
export type OathKind = 'daily' | 'habit' | 'todo';
export type Material = 'iron' | 'herb' | 'thread' | 'ink' | 'ember' | 'gel';
/** standard: the full game. gentle: tiny, zero-planning oaths and no penalties. kid: big-picture view, no penalties. */
export type HeroMode = 'standard' | 'gentle' | 'kid';

export interface Oath {
  id: string;
  kind: OathKind;
  title: string;
  notes: string;
  difficulty: Difficulty;
  stat: Stat;
  /** dailies: weekdays it is due, 0 = Sunday */
  days: number[];
  streak: number;
  bestStreak: number;
  /** dailies: hearth day it was last kept */
  doneDay: DayKey | null;
  /** habits: whether + and - buttons are shown */
  up: boolean;
  down: boolean;
  /** habits: today's taps, reset at the day turn */
  ups: number;
  downs: number;
  /** todos */
  done: boolean;
  doneAt: number | null;
  createdAt: number;
  createdDay: DayKey;
  /** dailies: missed nights in a row (0-3); keeping it again pays a rekindle bonus */
  cold: number;
  /** a picture (emoji) for the kid and gentle views */
  icon?: string;
}

export interface Look {
  sex: Sex;
  skin: string;
  hair: string; // style id
  hairColor: string;
}

export interface Hero {
  name: string;
  calling: string;
  look: Look;
  level: number;
  xp: number;
  hp: number;
  gold: number;
  mana: number;
  embers: number;
  skillPoints: number;
  perks: string[];
  statXp: Record<Stat, number>;
  titles: string[];
  title: string | null;
  familiar: string;
  familiars: string[];
  gear: string[];
  equipped: Partial<Record<Slot, string>>;
}

export interface Reward { id: string; title: string; cost: number; bought: number; }

export interface Quest { boss: string; hp: number; max: number; startedDay: DayKey; }

export interface Focus { startedAt: number; minutes: number; }

export interface ChronicleEntry { t: number; text: string; kind: 'keep' | 'miss' | 'level' | 'boss' | 'buy' | 'life' | 'mind' | 'focus' | 'forge' | 'story' | 'badge' | 'pet' | 'season' | 'chore' | 'rest'; }

export interface MindEvent { t: number; day: DayKey; oath: string; kind: 'keep' | 'slip' | 'miss' | 'forgiven'; stat: Stat; hour: number; }

export interface Mind {
  log: MindEvent[];
  dismissed: Record<string, DayKey>; // suggestion key -> hidden until
  accepted: number;
}

export interface DawnReport {
  day: DayKey;
  nights: number;
  missed: { title: string; hp: number }[];
  forgiven: { title: string; by: 'ember' | 'mercy' }[];
  streaksBroken: { title: string; was: number }[];
  hpLost: number;
  bossHits: number;
  bossName: string | null;
  gifts: string[];
  fell: boolean;
  goldLost: number;
  omen: string;
  keptYesterday: number;
  /** vitality the night cap spared */
  spared?: number;
  /** nights that were rest days (sick, away) and cost nothing */
  rested?: number;
}

export interface DayState {
  key: DayKey;
  omen: string;
  combo: number;
  lastKeepAt: number;
  rested: boolean;
  gifted: boolean;
  /** v4: the familiar was patted today; all of today's dailies were kept (celebrated once) */
  patted?: boolean;
  perfect?: boolean;
}

/** One hearth day, for charts and the weekly report. due/kept are dailies, settled at the day turn. */
export interface DayLog { due: number; kept: number; keeps: number; xp: number; gold: number; focus: number; paused?: boolean; perfect?: boolean; }

export interface ChoreStep { id: string; title: string; done: boolean; doneAt: number | null; }
/** A big real task turned into a foe: its health is its steps. */
export interface Chore { id: string; name: string; art: string; difficulty: Difficulty; stat: Stat; steps: ChoreStep[]; createdAt: number; beatenAt: number | null; }

/** Days off: sick, away or just resting. Dailies due on these days are not missed. */
export interface Pause { from: DayKey; to: DayKey; why: 'sick' | 'away' | 'rest'; }

export interface BossRecord { id: string; name: string; start: DayKey; end: DayKey | null; won: boolean; }

export interface Stats {
  keeps: number; slips: number; misses: number; focusMinutes: number; bossesDown: number;
  // v4 counters (best-effort reconstructed for older saves)
  dailyKeeps: number; todos: number; habitUps: number; perfectDays: number; rewardsBought: number; forged: number;
  rekindles: number; earlyKeeps: number; choreSteps: number; choreBosses: number; xpTotal: number; goldTotal: number;
  restDays: number; rites: number; statKeeps: Record<Stat, number>;
}

export interface Save {
  version: number;
  createdAt: number;
  hero: Hero;
  oaths: Oath[];
  rewards: Reward[];
  materials: Record<Material, number>;
  quest: Quest | null;
  defeated: string[];
  focus: Focus | null;
  day: DayState;
  lastDay: DayKey;
  dawn: DawnReport | null;
  chronicle: ChronicleEntry[];
  mind: Mind;
  settings: Settings;
  weekly: { week: DayKey; mercyUsed: boolean; coalsGiven: boolean };
  stats: Stats;
  // ---- v4
  mode: HeroMode;
  /** familiar id -> bond points; familiars grow through stages as you keep oaths */
  bonds: Record<string, number>;
  story: { chapter: number; base: Record<string, number> | null; claimed: number[] };
  season: { id: string; sparks: number; got: number[] };
  achievements: Record<string, number>;
  history: Record<DayKey, DayLog>;
  bossLog: BossRecord[];
  chores: Chore[];
  pauses: Pause[];
  /** the Monday of the last weekly report the hero has read */
  reportSeen: DayKey;
}

export interface Settings {
  dayStart: number; sound: boolean; location: string;
  /** v4: daily reminder (local time HH:MM) */
  reminder: { on: boolean; time: string };
  /** no vitality loss, no broken streaks, no boss bites (kid and gentle heroes) */
  noPenalty: boolean;
}
