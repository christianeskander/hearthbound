// Chore bosses: one big real task (the garage, the tax return) becomes a foe whose
// health is its sub-steps. Each step done is a strike and pays like a small errand;
// the last step beats it for a bonus.
import { earnGold } from './ledger';
import { award, chronicle, gainXp, keepVirtual, today, uid, type KeepResult, type Rng } from './rules';
import { SPARKS, addSparks } from './season';
import { checkBadges } from './achievements';
import type { Chore, Difficulty, Oath, Save, Stat } from './types';

export const CHORE_ART = ['slime', 'drift', 'gleam', 'maybe', 'rat', 'weight'] as const;
export const CHORE_IDEAS = ['The Laundry Mountain', 'The Inbox Hydra', 'The Garage', 'Tax Time', 'The Spare Room', 'The Paperwork Pile'];
export const MAX_STEPS = 30;
export const MAX_ACTIVE_CHORES = 6;

export interface ChoreInput { name: string; steps: string[]; difficulty?: Difficulty; stat?: Stat; art?: string; }

export function validateChore(c: ChoreInput): string | null {
  if (!c.name.trim()) return 'Name the big task.';
  if (c.name.trim().length > 40) return 'Keep the name under 40 characters.';
  const steps = c.steps.map((x) => x.trim()).filter(Boolean);
  if (steps.length < 2) return 'Break it into at least 2 steps. Smaller is better.';
  if (steps.length > MAX_STEPS) return `Up to ${MAX_STEPS} steps.`;
  return null;
}

export function addChore(s: Save, c: ChoreInput, now: number, rng: Rng = Math.random): Chore {
  const err = validateChore(c);
  if (err) throw new Error(err);
  if (s.chores.filter((x) => !x.beatenAt).length >= MAX_ACTIVE_CHORES) throw new Error(`You already have ${MAX_ACTIVE_CHORES} big tasks on the go. Finish one first.`);
  const name = c.name.trim();
  const art = c.art && (CHORE_ART as readonly string[]).includes(c.art) ? c.art : CHORE_ART[s.chores.length % CHORE_ART.length];
  const chore: Chore = {
    id: uid(rng), name, art, difficulty: c.difficulty || 'easy', stat: c.stat || 'craft', createdAt: now, beatenAt: null,
    steps: c.steps.map((x) => x.trim()).filter(Boolean).map((title) => ({ id: uid(rng), title: title.slice(0, 80), done: false, doneAt: null })),
  };
  s.chores.push(chore);
  chronicle(s, `Named a big task: ${name} (${chore.steps.length} steps).`, 'chore', now);
  return chore;
}

export const choreHp = (c: Chore) => c.steps.filter((x) => !x.done).length;
export const nextStep = (c: Chore) => c.steps.find((x) => !x.done) || null;
/** Bonus for beating it: grows with the number of steps, capped so a 30-step chore is not a gold mine. */
export const choreBonus = (c: Chore) => ({ gold: Math.min(30, 2 * c.steps.length), xp: Math.min(90, 6 * c.steps.length) });

export function addStep(s: Save, choreId: string, title: string, rng: Rng = Math.random) {
  const c = s.chores.find((x) => x.id === choreId);
  if (!c || c.beatenAt) throw new Error('That task is already beaten.');
  if (!title.trim()) throw new Error('Name the step.');
  if (c.steps.length >= MAX_STEPS) throw new Error(`Up to ${MAX_STEPS} steps.`);
  c.steps.push({ id: uid(rng), title: title.trim().slice(0, 80), done: false, doneAt: null });
}

export interface StepResult extends KeepResult { choreDown: Chore | null; bonus: { gold: number; xp: number } | null; }

export function strikeChore(s: Save, choreId: string, stepId: string, now: number, rng: Rng = Math.random): StepResult {
  const c = s.chores.find((x) => x.id === choreId);
  if (!c) throw new Error('No such task.');
  if (c.beatenAt) throw new Error('Already beaten.');
  const st = c.steps.find((x) => x.id === stepId);
  if (!st) throw new Error('No such step.');
  if (st.done) throw new Error('That step is done.');
  st.done = true; st.doneAt = now;
  s.stats.choreSteps++;
  const virtual: Oath = {
    id: 'chore:' + c.id, kind: 'todo', title: st.title, notes: '', difficulty: c.difficulty, stat: c.stat, days: [], streak: 0, bestStreak: 0, doneDay: null,
    up: false, down: false, ups: 0, downs: 0, done: true, doneAt: now, createdAt: c.createdAt, createdDay: today(s, now), cold: 0,
  };
  const r = keepVirtual(s, virtual, now, rng);
  chronicle(s, `${c.name}: "${st.title}" done (+${r.payout.gold} gold). ${choreHp(c)} to go.`, 'chore', now);
  let choreDown: Chore | null = null, bonus = null;
  if (choreHp(c) === 0) {
    c.beatenAt = now;
    choreDown = c;
    bonus = choreBonus(c);
    s.stats.choreBosses++;
    earnGold(s, bonus.gold, now);
    chronicle(s, `Beat ${c.name}! Every step done. +${bonus.gold} gold, +${bonus.xp} XP.`, 'chore', now);
    if (s.stats.choreBosses === 1) award(s, 'Chore Slayer', now);
    r.levelsGained += gainXp(s, bonus.xp, now);
    r.tiers.push(...addSparks(s, SPARKS.chore_boss, today(s, now), now));
    r.badges.push(...checkBadges(s, now));
  }
  return { ...r, choreDown, bonus };
}

export function deleteChore(s: Save, id: string) { s.chores = s.chores.filter((x) => x.id !== id); }
/** Beaten chores are kept for the record for 30 days, then cleared. */
export function trimChores(s: Save, now: number) { s.chores = s.chores.filter((c) => !c.beatenAt || now - c.beatenAt < 30 * 86400000); }
