// The weekly report card: what you kept last week, your best day, and what slipped,
// in gentle words. Grades are words, never letters, and nothing is ever "failed".
import { addDays, dowOf, type DayKey } from './time';
import { isPaused } from './pause';
import type { Save } from './types';

export type Grade = 'blazing' | 'bright' | 'warm' | 'kindling' | 'resting';
export const GRADE_INFO: Record<Grade, { name: string; flames: number }> = {
  blazing: { name: 'Blazing', flames: 4 }, bright: { name: 'Bright', flames: 3 }, warm: { name: 'Warm', flames: 2 },
  kindling: { name: 'Kindling', flames: 1 }, resting: { name: 'Resting', flames: 0 },
};
export function gradeOf(kept: number, due: number): Grade {
  if (due <= 0) return 'resting';
  const r = kept / due;
  return r >= 0.9 ? 'blazing' : r >= 0.75 ? 'bright' : r >= 0.5 ? 'warm' : 'kindling';
}

export interface WeekDay { day: DayKey; due: number; kept: number; keeps: number; xp: number; paused: boolean; perfect: boolean; }
export interface OathWeek { id: string; title: string; due: number; kept: number; grade: Grade; }
export interface WeekReport {
  week: DayKey; end: DayKey; days: WeekDay[]; due: number; kept: number; grade: Grade;
  keeps: number; xp: number; gold: number; focus: number; perfect: number; rested: number;
  best: WeekDay | null; oaths: OathWeek[]; slipped: OathWeek[]; strong: OathWeek[];
  foes: string[]; chores: string[]; message: string; more: number | null; empty: boolean;
}

/** Monday of the week before the one containing `day`. */
export const lastWeekOf = (day: DayKey) => addDays(day, -((dowOf(day) + 6) % 7) - 7);

export function weekReport(s: Save, week: DayKey): WeekReport {
  const days: WeekDay[] = [];
  const keys = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  for (const k of keys) {
    const h = s.history[k];
    const paused = isPaused(s, k) || !!h?.paused;
    days.push({ day: k, due: h?.due ?? 0, kept: h?.kept ?? 0, keeps: h?.keeps ?? 0, xp: h?.xp ?? 0, paused, perfect: !!h?.perfect });
  }
  const counted = days.filter((d) => !d.paused);
  const due = counted.reduce((a, d) => a + d.due, 0);
  const kept = counted.reduce((a, d) => a + Math.min(d.kept, d.due), 0);
  const sum = (f: (h: any) => number) => keys.reduce((a, k) => a + (s.history[k] ? f(s.history[k]) : 0), 0);
  const keeps = sum((h) => h.keeps), xp = sum((h) => h.xp), gold = sum((h) => h.gold), focus = sum((h) => h.focus);
  const best = days.reduce<WeekDay | null>((b, d) => (d.keeps > 0 && (!b || d.keeps > b.keeps) ? d : b), null);

  // per daily, from the Hearthmind log (which oath was kept on which day)
  const keptOn = new Map<string, Set<DayKey>>();
  for (const e of s.mind.log) if (e.kind === 'keep' && e.day >= week && e.day <= keys[6]) {
    if (!keptOn.has(e.oath)) keptOn.set(e.oath, new Set());
    keptOn.get(e.oath)!.add(e.day);
  }
  const oaths: OathWeek[] = [];
  for (const o of s.oaths) {
    if (o.kind !== 'daily') continue;
    const dd = keys.filter((k) => o.days.includes(dowOf(k)) && k >= o.createdDay && !isPaused(s, k) && !(s.history[k]?.paused));
    if (!dd.length) continue;
    const k = dd.filter((x) => keptOn.get(o.id)?.has(x)).length;
    oaths.push({ id: o.id, title: o.title, due: dd.length, kept: k, grade: gradeOf(k, dd.length) });
  }
  const slipped = oaths.filter((o) => o.due >= 2 && o.kept / o.due < 0.5).sort((a, b) => a.kept / a.due - b.kept / b.due).slice(0, 3);
  const strong = oaths.filter((o) => o.due >= 3 && o.kept === o.due);
  const foes = s.bossLog.filter((b) => b.won && b.end && b.end >= week && b.end <= keys[6]).map((b) => b.name);
  const chores = s.chores.filter((c) => c.beatenAt && dayOfT(s, c.beatenAt) >= week && dayOfT(s, c.beatenAt) <= keys[6]).map((c) => c.name);
  const rested = days.filter((d) => d.paused).length;
  const grade = gradeOf(kept, due);

  const prev = keys.map((k) => addDays(k, -7)).reduce((a, k) => a + (s.history[k]?.keeps ?? 0), 0);
  const more = keeps > prev && prev > 0 ? keeps - prev : null;
  const empty = keeps === 0 && due === 0 && rested === 0;
  return {
    week, end: keys[6], days, due, kept, grade, keeps, xp, gold, focus, perfect: days.filter((d) => d.perfect).length, rested,
    best, oaths, slipped, strong, foes, chores, message: messageFor(grade, keeps, rested, due), more, empty,
  };
}

function dayOfT(s: Save, t: number): DayKey {
  const d = new Date(t);
  if (d.getHours() < s.settings.dayStart) d.setDate(d.getDate() - 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function messageFor(g: Grade, keeps: number, rested: number, due: number): string {
  if (g === 'resting') return rested ? 'A resting week. Rest is part of it; the fire kept itself warm.' : keeps ? `${keeps} keeps, and nothing was due. Every one of them was a bonus.` : 'A quiet week. The hearth is still here whenever you are.';
  if (g === 'blazing') return 'A blazing week. Whatever you did, it worked. Do the same small things again.';
  if (g === 'bright') return 'A bright week. Most of what you promised, you kept.';
  if (g === 'warm') return 'A warm week. More kept than not, and that is how fires grow.';
  return due && keeps ? `Some weeks are like this, and every keep still counted (${keeps} of them). Pick the smallest one and start there. Picking a daily back up pays extra.` : 'A quiet week. Nothing is lost: the hearth is still here, and picking a daily back up pays extra.';
}
