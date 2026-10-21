import type { DayKey } from './time';

export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard';
export type Stat = 'might' | 'wit' | 'grit' | 'craft';
export type Sex = 'female' | 'male';
export type Slot = 'head' | 'torso' | 'cloak' | 'legs' | 'feet';
export type OathKind = 'daily' | 'habit' | 'todo';
export type Material = 'iron' | 'herb' | 'thread' | 'ink' | 'ember' | 'gel';

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

export interface ChronicleEntry { t: number; text: string; kind: 'keep' | 'miss' | 'level' | 'boss' | 'buy' | 'life' | 'mind' | 'focus' | 'forge'; }

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
}

export interface DayState {
  key: DayKey;
  omen: string;
  combo: number;
  lastKeepAt: number;
  rested: boolean;
  gifted: boolean;
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
  settings: { dayStart: number; sound: boolean; location: string };
  weekly: { week: DayKey; mercyUsed: boolean; coalsGiven: boolean };
  stats: { keeps: number; slips: number; misses: number; focusMinutes: number; bossesDown: number };
}
