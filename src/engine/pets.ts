// Familiars grow through stages as you keep oaths (bond points).
import { BOND_KEEP, FAMILIAR_STAGES, familiarById, type FamiliarStage } from './content';
import { addTitle } from './ledger';
import type { Save } from './types';

export const bondOf = (s: Save, id: string) => s.bonds[id] ?? 0;
export function stageFor(bond: number): FamiliarStage {
  let st = FAMILIAR_STAGES[0];
  for (const x of FAMILIAR_STAGES) if (bond >= x.at) st = x;
  return st;
}
export const stageOf = (s: Save, id: string) => stageFor(bondOf(s, id));
export function nextStage(s: Save, id: string): FamiliarStage | null {
  return FAMILIAR_STAGES.find((x) => x.at > bondOf(s, id)) || null;
}

export interface Evolved { familiar: string; name: string; stage: FamiliarStage; }

/** Adds bond to the familiar walking with you. Returns the new stage if it grew. */
export function addBond(s: Save, n = BOND_KEEP, now = Date.now()): Evolved | null {
  const id = s.hero.familiar;
  const before = stageOf(s, id);
  s.bonds[id] = bondOf(s, id) + n;
  const after = stageOf(s, id);
  if (after.id <= before.id) return null;
  const f = familiarById(id);
  const name = f?.name || 'Your familiar';
  s.chronicle.unshift({ t: now, text: `${name} grew: now ${after.name}. ${after.text}`, kind: 'pet' });
  if (after.id >= 3) addTitle(s, 'Friend of Elders');
  return { familiar: id, name, stage: after };
}

/** One pat a day (tap the familiar in the hall) is a small bond. */
export function patFamiliar(s: Save, now: number): Evolved | null | false {
  if (s.day.patted) return false;
  s.day.patted = true;
  return addBond(s, 1, now);
}
