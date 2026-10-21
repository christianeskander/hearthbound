// Hearth-day maths. A "hearth day" starts at the player's day-turn hour
// (default 4:00am local), so a keep at 1am still counts for the evening before.

export type DayKey = string; // YYYY-MM-DD in local time

const pad = (n: number) => String(n).padStart(2, '0');

export function keyOf(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(k: DayKey): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // noon avoids DST edges
}

export function hearthDay(now: number, startHour = 4): DayKey {
  const d = new Date(now);
  if (d.getHours() < startHour) return keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1, 12));
  return keyOf(d);
}

export function addDays(k: DayKey, n: number): DayKey {
  const d = parseKey(k);
  return keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12));
}

export function dayDiff(a: DayKey, b: DayKey): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

/** Days from `from` (inclusive) up to `to` (exclusive). */
export function daysBetween(from: DayKey, to: DayKey, cap = 400): DayKey[] {
  const out: DayKey[] = [];
  let k = from;
  while (k < to && out.length < cap) { out.push(k); k = addDays(k, 1); }
  return out;
}

export const dowOf = (k: DayKey) => parseKey(k).getDay(); // 0 = Sunday

/** Monday of the week containing k, used for weekly perks. */
export function weekOf(k: DayKey): DayKey {
  const dow = dowOf(k);
  return addDays(k, -((dow + 6) % 7));
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
