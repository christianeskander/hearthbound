// Small shared bookkeeping for v4: per-day history (for charts and the weekly
// report) and lifetime totals. Plain functions, no browser APIs.
import { hearthDay, type DayKey } from './time';
import type { DayLog, Save } from './types';

export const HISTORY_DAYS = 400;

export function dayLog(s: Save, day: DayKey): DayLog {
  let d = s.history[day];
  if (!d) { d = s.history[day] = { due: 0, kept: 0, keeps: 0, xp: 0, gold: 0, focus: 0 }; trimHistory(s); }
  return d;
}
export const dayOf = (s: Save, now: number) => hearthDay(now, s.settings.dayStart);

export function earnGold(s: Save, n: number, now: number) {
  if (!n) return;
  s.hero.gold += n;
  if (n > 0) { s.stats.goldTotal += n; dayLog(s, dayOf(s, now)).gold += n; }
}

export function trimHistory(s: Save) {
  const keys = Object.keys(s.history);
  if (keys.length <= HISTORY_DAYS) return;
  keys.sort();
  for (const k of keys.slice(0, keys.length - HISTORY_DAYS)) delete s.history[k];
}

export function addTitle(s: Save, title: string): boolean {
  if (s.hero.titles.includes(title)) return false;
  s.hero.titles.push(title);
  if (!s.hero.title) s.hero.title = title;
  return true;
}
