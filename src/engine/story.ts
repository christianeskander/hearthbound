// The story: "The Cold Hearth", a short questline in eight chapters. Each opens at a
// level, asks for things you already do in real life (keep dailies, train a stat,
// finish errands, beat a foe), and pays a reward when you claim it.
import { MAX_EMBERS } from './content';
import { earnGold } from './ledger';
import { award, chronicle, gainXp } from './rules';
import type { Material, Save, Stat } from './types';

export type Objective =
  | { k: 'count'; of: Counter; n: number; text: string }
  | { k: 'streak'; n: number; text: string }
  | { k: 'boss'; id: string; text: string };
type Counter = 'keeps' | 'dailyKeeps' | 'todos' | 'focusMinutes' | 'perfectDays' | 'rites' | 'choreSteps' | `stat:${Stat}`;

export interface ChapterReward { gold?: number; xp?: number; embers?: number; mats?: Partial<Record<Material, number>>; title?: string; gear?: string; }
export interface Chapter { n: number; title: string; level: number; text: string; goals: Objective[]; reward: ChapterReward; done: string; }

export const CHAPTERS: Chapter[] = [
  {
    n: 1, title: 'A Spark in the Ash', level: 1,
    text: 'The village hearth went out the winter you stopped believing small things count. The innkeeper hands you a flint. "Start with anything."',
    goals: [{ k: 'count', of: 'dailyKeeps', n: 3, text: 'Keep 3 dailies' }],
    reward: { gold: 15, xp: 20 }, done: 'A thread of smoke rises from the cold stones. It is not much. It is not nothing.',
  },
  {
    n: 2, title: 'The Water Road', level: 2,
    text: 'The well-keeper will lend you a lantern if you look after yourself first. "A tired hero lights nothing."',
    goals: [{ k: 'count', of: 'stat:grit', n: 3, text: 'Keep 3 Grit oaths (health, sleep, self-care)' }, { k: 'count', of: 'todos', n: 1, text: 'Finish 1 errand' }],
    reward: { embers: 1, xp: 30 }, done: 'The lantern is yours. It burns steady when you do.',
  },
  {
    n: 3, title: 'Lanterns on the North Road', level: 3,
    text: 'Someone has hung empty lanterns along the North Road. Each one lights when a promise is kept twice running.',
    goals: [{ k: 'streak', n: 3, text: 'Reach a 3-day streak on any daily' }, { k: 'count', of: 'keeps', n: 12, text: 'Keep 12 oaths of any kind' }],
    reward: { gold: 25, mats: { iron: 2, thread: 2 } }, done: 'Three lanterns glow in a row. Travellers have started using the road again.',
  },
  {
    n: 4, title: 'The Slime Who Said Later', level: 4,
    text: 'In the Old Wood a slime sits on the path, murmuring "tomorrow". It is why the hearth went cold. It is smaller than it sounds.',
    goals: [{ k: 'boss', id: 'slime', text: 'Beat the Slime of Later' }, { k: 'count', of: 'rites', n: 1, text: 'Finish a focus rite' }],
    reward: { xp: 60, title: 'Lamplighter' }, done: 'The slime is gone. Under it: the first stone of the old hearth, still warm.',
  },
  {
    n: 5, title: 'The Quiet Library', level: 6,
    text: 'The scriptorium keeps the hearth\'s old recipes, but the shelves only open for someone who can sit still a while.',
    goals: [{ k: 'count', of: 'stat:wit', n: 5, text: 'Keep 5 Wit oaths (learning, focus, planning)' }, { k: 'count', of: 'focusMinutes', n: 45, text: 'Spend 45 minutes in focus rites' }],
    reward: { gold: 40, mats: { ink: 3 } }, done: 'You find the recipe. It is three words long: one, then another.',
  },
  {
    n: 6, title: 'One Clean Day', level: 8,
    text: 'The Gnawing Doubt lives in the walls of the inn and whispers that you never finish anything. Prove it wrong, twice.',
    goals: [{ k: 'count', of: 'perfectDays', n: 2, text: 'Keep every daily on 2 days' }, { k: 'boss', id: 'rat', text: 'Beat the Gnawing Doubt' }],
    reward: { embers: 1, xp: 90, title: 'Wall-Mender' }, done: 'The walls are quiet. The inn feels bigger without the doubt in it.',
  },
  {
    n: 7, title: 'Hours Like Water', level: 11,
    text: 'Past the coast the hours run like water, and a mushroom grows wherever a choice was never made. Name the time. Pick a thing.',
    goals: [{ k: 'boss', id: 'drift', text: 'Beat the Drift' }, { k: 'boss', id: 'maybe', text: 'Beat the Mushroom of Maybe' }, { k: 'streak', n: 7, text: 'Reach a 7-day streak on any daily' }],
    reward: { gold: 60, mats: { ember: 2, herb: 3 } }, done: 'The tide goes out. You can see the shape of your days again.',
  },
  {
    n: 8, title: 'The Hearth Restored', level: 15,
    text: 'On Ember Ridge the last two shadows wait: the gleam that wants everything perfect, and the weight of everything at once. You do not lift it all. You lift the next thing.',
    goals: [{ k: 'boss', id: 'gleam', text: 'Beat the Gleam of Perfect' }, { k: 'boss', id: 'weight', text: 'Beat the Weight of Everything' }, { k: 'count', of: 'perfectDays', n: 5, text: 'Keep every daily on 5 days' }],
    reward: { gold: 80, xp: 200, title: 'Hearth-Restorer', gear: 'cape_story' }, done: 'The village hearth roars back to life. It was never one big fire. It was all the small ones.',
  },
];

export function counter(s: Save, c: Counter): number {
  if (c.startsWith('stat:')) return s.stats.statKeeps[c.slice(5) as Stat] || 0;
  return (s.stats as any)[c] || 0;
}
function snapshot(s: Save) {
  const out: Record<string, number> = {};
  for (const ch of CHAPTERS) for (const g of ch.goals) if (g.k === 'count') out[g.of] = counter(s, g.of);
  return out;
}

export const currentChapter = (s: Save): Chapter | null => CHAPTERS.find((c) => !s.story.claimed.includes(c.n)) || null;
export const isOpen = (s: Save, c: Chapter) => s.hero.level >= c.level;

/** Starts counting for the current chapter once its level is reached. */
export function syncStory(s: Save) {
  const c = currentChapter(s);
  if (!c) return;
  if (s.story.chapter !== c.n) { s.story.chapter = c.n; s.story.base = null; }
  if (isOpen(s, c) && !s.story.base) s.story.base = snapshot(s);
}

export interface GoalState { text: string; have: number; need: number; done: boolean; }
export function goalStates(s: Save, c: Chapter): GoalState[] {
  const base = s.story.chapter === c.n ? s.story.base : null;
  return c.goals.map((g) => {
    if (g.k === 'boss') { const d = s.defeated.includes(g.id); return { text: g.text, have: d ? 1 : 0, need: 1, done: d }; }
    if (g.k === 'streak') { const best = Math.max(0, ...s.oaths.filter((o) => o.kind === 'daily').map((o) => o.streak)); return { text: g.text, have: Math.min(best, g.n), need: g.n, done: best >= g.n }; }
    const have = base ? Math.max(0, counter(s, g.of) - (base[g.of] ?? counter(s, g.of))) : 0;
    return { text: g.text, have: Math.min(have, g.n), need: g.n, done: have >= g.n };
  });
}
export function canClaim(s: Save): Chapter | null {
  const c = currentChapter(s);
  if (!c || !isOpen(s, c) || !s.story.base) return null;
  return goalStates(s, c).every((g) => g.done) ? c : null;
}

export function rewardLine(r: ChapterReward): string {
  const b: string[] = [];
  if (r.gold) b.push(`${r.gold} gold`);
  if (r.xp) b.push(`${r.xp} XP`);
  if (r.embers) b.push(`${r.embers} ember token`);
  if (r.mats) b.push(Object.entries(r.mats).map(([k, v]) => `${v} ${k}`).join(', '));
  if (r.title) b.push(`the title "${r.title}"`);
  if (r.gear) b.push('the Storyteller\'s Cloak');
  return b.join(' · ');
}

export function claimChapter(s: Save, now: number): { chapter: Chapter; levels: number } {
  syncStory(s);
  const c = canClaim(s);
  if (!c) throw new Error('This chapter is not finished yet.');
  const r = c.reward;
  s.story.claimed.push(c.n);
  if (r.gold) earnGold(s, r.gold, now);
  if (r.embers) s.hero.embers = Math.min(MAX_EMBERS, s.hero.embers + r.embers);
  if (r.mats) for (const [k, v] of Object.entries(r.mats) as [Material, number][]) s.materials[k] = (s.materials[k] || 0) + v;
  if (r.title) award(s, r.title, now);
  if (r.gear && !s.hero.gear.includes(r.gear)) { s.hero.gear.push(r.gear); }
  chronicle(s, `Story, chapter ${c.n} "${c.title}": ${c.done}`, 'story', now);
  const levels = r.xp ? gainXp(s, r.xp, now) : 0;
  s.story.base = null;
  syncStory(s);
  return { chapter: c, levels };
}
