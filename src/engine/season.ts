// The season pass: one theme per calendar month, a free track of ten rewards that
// unlocks through play (sparks). Rewards are granted the moment a tier is reached,
// so there is nothing to remember to claim.
import { MATERIALS, MAX_EMBERS, SEASON_THEMES, type SeasonTheme } from './content';
import { addTitle, earnGold } from './ledger';
import { parseKey, type DayKey } from './time';
import type { Material, Save } from './types';

/** How many sparks each action gives. */
export const SPARKS = { daily: 2, todo: 2, habit: 1, chore: 1, focus15: 3, boss: 10, perfect: 3, chore_boss: 5 } as const;

export type SeasonReward =
  | { kind: 'gold'; n: number }
  | { kind: 'embers'; n: number }
  | { kind: 'mats'; mats: Partial<Record<Material, number>> }
  | { kind: 'title' }
  | { kind: 'cloak' };
export interface Tier { at: number; reward: SeasonReward; }
// About 330 sparks a month for a steady player, 190 average, 90 struggling (see BALANCE.md).
export const TRACK: Tier[] = [
  { at: 10, reward: { kind: 'gold', n: 3 } },
  { at: 25, reward: { kind: 'mats', mats: { herb: 2, thread: 1 } } },
  { at: 45, reward: { kind: 'embers', n: 1 } },
  { at: 70, reward: { kind: 'gold', n: 5 } },
  { at: 100, reward: { kind: 'title' } },
  { at: 130, reward: { kind: 'mats', mats: { ember: 2 } } },
  { at: 160, reward: { kind: 'gold', n: 7 } },
  { at: 190, reward: { kind: 'mats', mats: { iron: 2, ink: 2 } } },
  { at: 225, reward: { kind: 'embers', n: 1 } },
  { at: 260, reward: { kind: 'cloak' } },
];

export const seasonIdOf = (day: DayKey) => day.slice(0, 7);
export function themeOf(id: string): SeasonTheme { return SEASON_THEMES[(Number(id.slice(5, 7)) - 1 + 12) % 12] || SEASON_THEMES[0]; }
export const seasonTitle = (id: string) => `${themeOf(id).name.replace(/^The /, '')} Wanderer`;
export const seasonCloak = (id: string) => `cape_season_${Number(id.slice(5, 7))}`;
export function daysLeft(day: DayKey) {
  const d = parseKey(day);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return end - d.getDate() + 1;
}

export function rewardText(r: SeasonReward, id: string): string {
  switch (r.kind) {
    case 'gold': return `${r.n} gold`;
    case 'embers': return `${r.n} ember token`;
    case 'mats': return Object.entries(r.mats).map(([k, v]) => `${v}× ${(MATERIALS as Record<string, { name: string }>)[k]?.name || k}`).join(', ');
    case 'title': return `Title: ${seasonTitle(id)}`;
    case 'cloak': return themeOf(id).cloak;
  }
}

/** Starts the month's season if the calendar has moved on. Old sparks stay in the old month. */
export function rollSeason(s: Save, day: DayKey) {
  const id = seasonIdOf(day);
  if (s.season.id !== id) s.season = { id, sparks: 0, got: [] };
}

/** Adds sparks and grants any tiers reached. Returns the tier indexes just unlocked. */
export function addSparks(s: Save, n: number, day: DayKey, now: number): number[] {
  rollSeason(s, day);
  s.season.sparks += n;
  const out: number[] = [];
  TRACK.forEach((t, i) => {
    if (s.season.sparks >= t.at && !s.season.got.includes(i)) {
      s.season.got.push(i);
      grant(s, t.reward, now);
      out.push(i);
    }
  });
  if (out.length) s.chronicle.unshift({ t: now, text: `${themeOf(s.season.id).name}: ${out.map((i) => rewardText(TRACK[i].reward, s.season.id)).join(', ')}.`, kind: 'season' });
  return out;
}

function grant(s: Save, r: SeasonReward, now: number) {
  if (r.kind === 'gold') earnGold(s, r.n, now);
  else if (r.kind === 'embers') { if (s.hero.embers < MAX_EMBERS) s.hero.embers = Math.min(MAX_EMBERS, s.hero.embers + r.n); else earnGold(s, 10 * r.n, now); }
  else if (r.kind === 'mats') for (const [k, v] of Object.entries(r.mats) as [Material, number][]) s.materials[k] = (s.materials[k] || 0) + v;
  else if (r.kind === 'title') addTitle(s, seasonTitle(s.season.id));
  else if (r.kind === 'cloak') { const g = seasonCloak(s.season.id); if (!s.hero.gear.includes(g)) s.hero.gear.push(g); }
}

export const trackDone = (s: Save) => s.season.got.length >= TRACK.length;
