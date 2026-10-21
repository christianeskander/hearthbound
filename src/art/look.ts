import { gearById, type ArtLayer } from '../engine/content';
import type { Look, Slot } from '../engine/types';

export const SKINS = ['light', 'amber', 'olive', 'taupe', 'bronze', 'brown', 'black'];
export const SKIN_NAMES: Record<string, string> = { light: 'Fair', amber: 'Warm', olive: 'Olive', taupe: 'Taupe', bronze: 'Bronze', brown: 'Brown', black: 'Deep' };
export const HAIRS: { id: string; name: string }[] = [
  { id: 'plain', name: 'Short' }, { id: 'messy', name: 'Messy' }, { id: 'buzz', name: 'Buzzed' }, { id: 'pixie', name: 'Pixie' },
  { id: 'bob', name: 'Bob' }, { id: 'bangs', name: 'Bangs' }, { id: 'ponytail', name: 'Ponytail' }, { id: 'long', name: 'Long' },
];
export const HAIR_COLORS = ['black', 'dark_brown', 'chestnut', 'light_brown', 'blonde', 'ginger', 'redhead', 'gray', 'white', 'platinum', 'navy', 'rose'];

export interface Part { file: string; z: number; pal?: 'body' | 'hair' | 'cloth' | 'metal'; color?: string; }

/** Every layer the hero is drawn from, bottom to top, for this look and this gear. */
export function partsFor(look: Look, equipped: Partial<Record<Slot, string>>): Part[] {
  const sfx = look.sex === 'male' ? 'm' : 'f';
  const out: Part[] = [
    { file: `body_${look.sex}`, z: 10, pal: 'body', color: look.skin },
    { file: `head_${look.sex}`, z: 100, pal: 'body', color: look.skin },
    { file: 'eyes', z: 105 },
  ];
  const hat = equipped.head ? gearById(equipped.head) : undefined;
  const hooded = hat?.art.some((a) => a.part === 'hood');
  if (look.hair === 'ponytail') {
    out.push({ file: 'hair_ponytail', z: 120, pal: 'hair', color: look.hairColor });
    if (!hooded) out.push({ file: 'hair_ponytail_bg', z: 9, pal: 'hair', color: look.hairColor });
  } else out.push({ file: `hair_${look.hair}`, z: 120, pal: 'hair', color: look.hairColor });
  for (const slot of ['feet', 'legs', 'torso', 'cloak', 'head'] as Slot[]) {
    const g = equipped[slot] ? gearById(equipped[slot]!) : undefined;
    if (!g) continue;
    for (const a of g.art) out.push(resolve(a, sfx));
  }
  return out.sort((a, b) => a.z - b.z);
}

function resolve(a: ArtLayer, sfx: string): Part {
  return { file: a.part.endsWith('_') ? a.part + sfx : a.part, z: a.z, pal: a.pal, color: a.color };
}

export const lookKey = (look: Look, equipped: Partial<Record<Slot, string>>) =>
  partsFor(look, equipped).map((p) => `${p.file}:${p.color || ''}`).join('|');

// ---------------------------------------------------------------- familiars & foes
export interface SpriteInfo { file: string; n: number; w: number; h: number; walk: number[]; ms: number; foot: number; fly?: boolean; idle?: number; }
export const PET_ART: Record<string, SpriteInfo> = {
  soot: { file: 'pets/soot.png', n: 4, w: 24, h: 24, walk: [0, 1, 2, 1], ms: 150, foot: 21, idle: 3 },
  hazel: { file: 'pets/hazel.png', n: 4, w: 32, h: 32, walk: [0, 1, 2, 1], ms: 140, foot: 29, idle: 3 },
  bramble: { file: 'pets/bramble.png', n: 4, w: 38, h: 38, walk: [0, 1, 2, 3], ms: 125, foot: 29 },
  pip: { file: 'pets/pip.png', n: 3, w: 16, h: 16, walk: [0, 1, 2], ms: 90, foot: 14 },
  inkling: { file: 'pets/inkling.png', n: 6, w: 32, h: 32, walk: [0, 1, 2, 1], ms: 120, foot: 23, fly: true, idle: 3 },
};
export const BOSS_ART: Record<string, SpriteInfo & { row: Record<string, number>; frames: number }> = {
  slime: { file: 'bosses/slime.png', n: 50, w: 64, h: 64, walk: [], ms: 110, foot: 64, row: { idle: 0, gesture: 1, walk: 2, attack: 3, death: 4 }, frames: 10 },
  rat: { file: 'bosses/rat.png', n: 12, w: 80, h: 64, walk: [0, 1, 2, 3], ms: 130, foot: 56, row: {}, frames: 12 },
};
