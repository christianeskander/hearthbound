// Family mode: several heroes on one device, each with a separate save.
// The first hero keeps the original key (hearthbound.save), so a v1/v3 save is
// simply "the first hero" and nothing has to move.
import type { HeroMode } from './types';

export const FAMILY_KEY = 'hearthbound.family';
export const MAIN_ID = 'main';
export const saveKey = (id: string) => (id === MAIN_ID ? 'hearthbound.save' : `hearthbound.save.${id}`);
export const backupKey = (id: string) => saveKey(id) + '.backup';

export interface Member { id: string; name: string; mode: HeroMode; level: number; }
export interface Family { active: string; members: Member[]; }

export const MAX_HEROES = 8;

export function parseFamily(raw: string | null, hasMain: boolean): Family {
  let f: Family | null = null;
  try { f = raw ? JSON.parse(raw) : null; } catch { f = null; }
  const members = Array.isArray(f?.members) ? f!.members.filter((m) => m && typeof m.id === 'string' && /^[a-z0-9]{1,24}$/.test(m.id)).map((m) => ({
    id: m.id, name: typeof m.name === 'string' ? m.name.slice(0, 24) : 'Hero', mode: (['standard', 'gentle', 'kid'] as HeroMode[]).includes(m.mode) ? m.mode : 'standard', level: Number(m.level) || 1,
  })) : [];
  if (hasMain && !members.some((m) => m.id === MAIN_ID)) members.unshift({ id: MAIN_ID, name: 'Hero', mode: 'standard', level: 1 });
  const active = f && members.some((m) => m.id === f!.active) ? f.active : members[0]?.id ?? MAIN_ID;
  return { active, members };
}

export function newMemberId(f: Family, rnd = Math.random): string {
  if (!f.members.some((m) => m.id === MAIN_ID)) return MAIN_ID;
  let id = '';
  do { id = 'h' + Math.floor(rnd() * 36 ** 6).toString(36); } while (f.members.some((m) => m.id === id));
  return id;
}

export const MODE_NAMES: Record<HeroMode, { name: string; text: string }> = {
  standard: { name: 'Full game', text: 'Dailies, habits, errands, foes, the whole thing.' },
  gentle: { name: 'Gentle', text: 'Tiny, zero-planning wins. Nothing is ever lost for a missed day.' },
  kid: { name: 'Little one', text: 'Big picture buttons and stars. No penalties, ever. For ages 3 to 6.' },
};
