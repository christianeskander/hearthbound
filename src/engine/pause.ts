// Rest days (sick, away, or just a day off). A daily due on a rest day is not
// missed: no vitality, no broken streak, no boss bite. Keeps still pay.
import { addDays, dayDiff, type DayKey } from './time';
import type { Pause, Save } from './types';

export const MAX_PAUSE_DAYS = 30;

export const isPaused = (s: Save, day: DayKey) => s.pauses.some((p) => p.from <= day && day <= p.to);

export function addPause(s: Save, from: DayKey, to: DayKey, why: Pause['why'], today: DayKey): Pause {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('Pick the days.');
  if (to < from) [from, to] = [to, from];
  if (from < today) throw new Error('Rest days can start today or later. Past nights have already been counted.');
  if (dayDiff(from, to) + 1 > MAX_PAUSE_DAYS) throw new Error(`Up to ${MAX_PAUSE_DAYS} days at a time.`);
  // merge with anything overlapping, so the list stays short
  const p: Pause = { from, to, why };
  s.pauses = s.pauses.filter((x) => {
    if (x.to < addDays(from, -1) || x.from > addDays(to, 1)) return true;
    p.from = x.from < p.from ? x.from : p.from; p.to = x.to > p.to ? x.to : p.to;
    return false;
  });
  s.pauses.push(p);
  s.pauses.sort((a, b) => (a.from < b.from ? -1 : 1));
  s.stats.restDays += dayDiff(from, to) + 1;
  return p;
}

/** Ends a rest early. Days already behind you stay rested. */
export function endPause(s: Save, from: DayKey, today: DayKey) {
  const p = s.pauses.find((x) => x.from === from);
  if (!p) return;
  if (p.from >= today) s.pauses = s.pauses.filter((x) => x !== p);
  else p.to = addDays(today, -1);
}

/** Forget rests that ended long ago. */
export function trimPauses(s: Save, today: DayKey) {
  s.pauses = s.pauses.filter((p) => dayDiff(p.to, today) <= 120);
}
