// Hearthmind: a small, on-device pattern learner. It only reads this save's
// own log of keeps, slips and misses, and every suggestion can be dismissed.
import { DIFFS, STATS, STAT_IDS } from './content';
import { addOath, isDueOn, today } from './rules';
import { addDays, daysBetween, type DayKey } from './time';
import type { Difficulty, Save, Stat } from './types';

export type Suggestion =
  | { key: string; kind: 'shrink'; oathId: string; title: string; text: string; why: string; to: Difficulty }
  | { key: string; kind: 'untrained'; stat: Stat; title: string; text: string; why: string; oath: string }
  | { key: string; kind: 'hour'; title: string; text: string; why: string }
  | { key: string; kind: 'streak'; oathId: string; title: string; text: string; why: string };

export const STARTERS: Record<Stat, string[]> = {
  might: ['Stretch for 5 minutes', 'Walk round the block', 'Ten squats while the kettle boils'],
  wit: ['Read 5 pages', 'Write tomorrow\'s top three', 'Ten minutes on something you are learning'],
  grit: ['Lights out by 11', 'Eat something green', 'Take your meds with breakfast'],
  craft: ['Clear one surface', 'Answer one email you are avoiding', 'Two minutes on the dishes'],
};

export function mindLevel(s: Save) {
  const n = s.mind.log.length;
  if (n < 10) return { name: 'Spark', next: 10, n };
  if (n < 40) return { name: 'Ember', next: 40, n };
  if (n < 120) return { name: 'Flame', next: 120, n };
  return { name: 'Hearthfire', next: null, n };
}

const hidden = (s: Save, key: string, day: DayKey) => !!s.mind.dismissed[key] && s.mind.dismissed[key] > day;

export function fmtHour(h: number) {
  const ap = h < 12 ? 'am' : 'pm';
  const x = h % 12 === 0 ? 12 : h % 12;
  return `${x}${ap}`;
}

export function suggest(s: Save, now: number): Suggestion | null {
  const d = today(s, now);
  const recent = s.mind.log.filter((e) => e.day > addDays(d, -15));
  const out: Suggestion[] = [];

  // 1. A daily that keeps slipping: offer a smaller version.
  for (const o of s.oaths) {
    if (o.kind !== 'daily') continue;
    const days = daysBetween(addDays(d, -7), d).filter((k) => isDueOn(o, k) && k >= o.createdDay);
    if (days.length < 3) continue;
    const misses = recent.filter((e) => e.oath === o.id && (e.kind === 'miss' || e.kind === 'forgiven') && days.includes(e.day)).length;
    if (misses >= 3 && misses / days.length >= 0.5) {
      const i = DIFFS.indexOf(o.difficulty);
      const key = 'shrink:' + o.id;
      if (hidden(s, key, d)) continue;
      out.push({
        key, kind: 'shrink', oathId: o.id, to: i > 0 ? DIFFS[i - 1] : 'trivial',
        title: `"${o.title}" has slipped ${misses} of the last ${days.length} days`,
        text: i > 0 ? 'Want to make it smaller for a while? A tiny version you actually do beats a big one you skip.' : 'It is already tiny. Want a 2-minute starter version alongside it?',
        why: `Seen in your log: ${misses} misses since ${days[0]}.`,
      });
    }
  }

  // 2. A stat nobody is training.
  const keeps = recent.filter((e) => e.kind === 'keep');
  if (keeps.length >= 8) {
    const per = Object.fromEntries(STAT_IDS.map((st) => [st, keeps.filter((e) => e.stat === st).length])) as Record<Stat, number>;
    const cold = STAT_IDS.filter((st) => per[st] === 0 && !s.oaths.some((o) => o.stat === st && !o.done));
    for (const st of cold) {
      const key = 'untrained:' + st;
      if (hidden(s, key, d)) continue;
      const pick = STARTERS[st][s.mind.accepted % STARTERS[st].length];
      out.push({
        key, kind: 'untrained', stat: st, oath: pick,
        title: `Your ${STATS[st].name} is untrained`,
        text: `${STATS[st].about}. A small one to start: "${pick}".`,
        why: `${keeps.length} keeps in two weeks, none for ${STATS[st].name}.`,
      });
    }
  }

  // 3. The hour you actually show up.
  const timed = keeps.filter((e) => e.hour >= 0);
  if (timed.length >= 10) {
    const buckets = new Array(24).fill(0);
    for (const e of timed) buckets[e.hour]++;
    let best = 0, at = 0;
    for (let h = 0; h < 24; h++) { const w = buckets[h] + buckets[(h + 1) % 24] + buckets[(h + 2) % 24]; if (w > best) { best = w; at = h; } }
    const share = best / timed.length;
    const key = 'hour:' + at;
    if (share >= 0.5 && !hidden(s, key, d)) out.push({
      key, kind: 'hour',
      title: `You do most of your keeping between ${fmtHour(at)} and ${fmtHour((at + 3) % 24)}`,
      text: 'That is your window. Putting the trickiest oath there gives it the best odds.',
      why: `${Math.round(share * 100)}% of ${timed.length} recent keeps.`,
    });
  }

  // 4. A good streak still open late in your usual day.
  const hour = new Date(now).getHours();
  for (const o of s.oaths) {
    if (o.kind !== 'daily' || o.streak < 5 || o.doneDay === d || !isDueOn(o, d)) continue;
    const usual = s.mind.log.filter((e) => e.oath === o.id && e.kind === 'keep' && e.hour >= 0).map((e) => e.hour);
    if (usual.length < 4) continue;
    const avg = usual.reduce((a, b) => a + b, 0) / usual.length;
    const key = `streak:${o.id}:${d}`;
    if (hour >= avg + 2 && !hidden(s, key, d)) out.push({
      key, kind: 'streak', oathId: o.id,
      title: `${o.streak}-day streak on "${o.title}" is still open`,
      text: `You usually keep it around ${fmtHour(Math.round(avg))}. Still time.`,
      why: `Average of your last ${usual.length} keeps.`,
    });
  }

  const order = { streak: 0, shrink: 1, untrained: 2, hour: 3 } as const;
  out.sort((a, b) => order[a.kind] - order[b.kind]);
  return out[0] || null;
}

export function dismiss(s: Save, sug: Suggestion, now: number, days = 7) {
  s.mind.dismissed[sug.key] = addDays(today(s, now), days);
}

export function accept(s: Save, sug: Suggestion, now: number) {
  if (sug.kind === 'shrink') {
    const o = s.oaths.find((x) => x.id === sug.oathId);
    if (o) {
      if (o.difficulty === 'trivial') addOath(s, { kind: 'daily', title: `Just start: ${o.title}`.slice(0, 80), difficulty: 'trivial', stat: o.stat, days: o.days }, now);
      else o.difficulty = sug.to;
    }
  } else if (sug.kind === 'untrained') {
    addOath(s, { kind: 'daily', title: sug.oath, difficulty: 'trivial', stat: sug.stat, days: [0, 1, 2, 3, 4, 5, 6] }, now);
  }
  s.mind.accepted++;
  dismiss(s, sug, now, 14);
}
