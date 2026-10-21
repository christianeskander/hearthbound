import type { Difficulty, Material, Slot, Stat } from './types';

export const DIFF: Record<Difficulty, { label: string; xp: number; gold: number; mana: number; strike: number; hurt: number }> = {
  trivial: { label: 'Tiny', xp: 4, gold: 1, mana: 1, strike: 2, hurt: 2 },
  easy: { label: 'Easy', xp: 8, gold: 2, mana: 1, strike: 4, hurt: 4 },
  medium: { label: 'Steady', xp: 14, gold: 4, mana: 2, strike: 6, hurt: 6 },
  hard: { label: 'Hard', xp: 22, gold: 7, mana: 3, strike: 9, hurt: 9 },
};
export const DIFFS: Difficulty[] = ['trivial', 'easy', 'medium', 'hard'];

export const STATS: Record<Stat, { name: string; about: string; effect: string }> = {
  might: { name: 'Might', about: 'Body, movement, outdoors', effect: '+2% strike per rank' },
  wit: { name: 'Wit', about: 'Learning, focus, planning', effect: '+1% XP per rank' },
  grit: { name: 'Grit', about: 'Health, sleep, self-care', effect: 'Misses hurt 1.5% less per rank' },
  craft: { name: 'Craft', about: 'Home, work, making things', effect: '+1% gold per rank' },
};
export const STAT_IDS: Stat[] = ['might', 'wit', 'grit', 'craft'];

export interface Mods {
  xp: number; gold: number; mana: number; strike: number; missCut: number; drop: number;
  crit: number; comboWindow: number; comboCap: number; focus: number; maxHp: number; price: number; omenScale: number; forgeDiscount: number;
}
export const BASE_MODS: Mods = { xp: 0, gold: 0, mana: 0, strike: 0, missCut: 0, drop: 0, crit: 0.05, comboWindow: 20, comboCap: 6, focus: 0, maxHp: 0, price: 0, omenScale: 1, forgeDiscount: 0 };

export interface Calling { id: string; name: string; blurb: string; perk: string; mods: Partial<Mods>; }
export const CALLINGS: Calling[] = [
  { id: 'vanguard', name: 'Vanguard', blurb: 'Goes first, hits hard.', perk: 'Strikes on foes +30%', mods: { strike: 0.3 } },
  { id: 'warden', name: 'Warden', blurb: 'Steady, hard to knock down.', perk: '+20 max vitality, misses hurt 20% less', mods: { maxHp: 20, missCut: 0.2 } },
  { id: 'scholar', name: 'Scholar', blurb: 'Learns from every day.', perk: '+15% experience', mods: { xp: 0.15 } },
  { id: 'pathfinder', name: 'Pathfinder', blurb: 'Finds the coin on the road.', perk: '+15% gold, combo window +10 min', mods: { gold: 0.15, comboWindow: 10 } },
  { id: 'mystic', name: 'Mystic', blurb: 'Draws power from stillness.', perk: '+50% mana, focus rites pay +50%', mods: { mana: 0.5, focus: 0.5 } },
  { id: 'tinker', name: 'Tinker', blurb: 'Makes something of everything.', perk: 'Drops twice as often, forge needs 1 less of each', mods: { drop: 1, forgeDiscount: 1 } },
];

export interface Perk { id: string; branch: 'hearth' | 'blade' | 'craft'; tier: number; name: string; text: string; mods?: Partial<Mods>; }
export const PERKS: Perk[] = [
  { id: 'soft_landing', branch: 'hearth', tier: 1, name: 'Soft Landing', text: 'Misses cost 25% less vitality.', mods: { missCut: 0.25 } },
  { id: 'banked_coals', branch: 'hearth', tier: 2, name: 'Banked Coals', text: 'Gain an ember token every Monday dawn (max 3).' },
  { id: 'mercy', branch: 'hearth', tier: 3, name: 'Mercy', text: 'Once a week, a missed daily is forgiven for free.' },
  { id: 'keen_edge', branch: 'blade', tier: 1, name: 'Keen Edge', text: 'Strikes on foes +20%.', mods: { strike: 0.2 } },
  { id: 'follow_through', branch: 'blade', tier: 2, name: 'Follow Through', text: 'Combo window +15 min, combo can climb to x1.7.', mods: { comboWindow: 15, comboCap: 8 } },
  { id: 'bright_eye', branch: 'blade', tier: 3, name: 'Bright Eye', text: '+5% chance of a bright keep (x1.5).', mods: { crit: 0.05 } },
  { id: 'gleaner', branch: 'craft', tier: 1, name: 'Gleaner', text: 'Forge materials drop 50% more often.', mods: { drop: 0.5 } },
  { id: 'thrift', branch: 'craft', tier: 2, name: 'Thrift', text: 'Market prices 10% lower.', mods: { price: 0.1 } },
  { id: 'omen_reader', branch: 'craft', tier: 3, name: 'Omen Reader', text: 'The day\'s omen is twice as strong.', mods: { omenScale: 2 } },
];

export interface Omen { id: string; name: string; text: string; mods: Partial<Mods>; missHalf?: boolean; }
export const OMENS: Omen[] = [
  { id: 'warm_wind', name: 'Warm Wind', text: '+25% gold today', mods: { gold: 0.25 } },
  { id: 'clear_sky', name: 'Clear Sky', text: '+20% XP today', mods: { xp: 0.2 } },
  { id: 'low_tide', name: 'Low Tide', text: 'Tonight, misses cost half', mods: {}, missHalf: true },
  { id: 'lucky_star', name: 'Lucky Star', text: '+10% chance of a bright keep', mods: { crit: 0.1 } },
  { id: 'iron_day', name: 'Iron Day', text: '+30% strikes on foes', mods: { strike: 0.3 } },
  { id: 'quiet_hearth', name: 'Quiet Hearth', text: 'Mana doubled today', mods: { mana: 1 } },
  { id: 'gleaning_moon', name: 'Gleaning Moon', text: 'Drops +50% today', mods: { drop: 0.5 } },
];

export interface Boss { id: string; name: string; blurb: string; hp: number; power: number; gold: number; xp: number; title: string; drop: [Material, number]; location: string; needs?: string; }
export const BOSSES: Boss[] = [
  { id: 'slime', name: 'The Slime of Later', blurb: 'Always one step ahead, saying "tomorrow". Every keep is a strike. Every missed daily lets it splash you back.', hp: 80, power: 3, gold: 60, xp: 100, title: 'Breaker of Later', drop: ['gel', 3], location: 'wood' },
  { id: 'rat', name: 'The Gnawing Doubt', blurb: 'A big grey rat that chews on good intentions. Tougher, and it bites harder.', hp: 150, power: 5, gold: 120, xp: 180, title: 'Quiet Mind', drop: ['ember', 2], location: 'road', needs: 'slime' },
];

export interface Location { id: string; name: string; level: number; }
export const LOCATIONS: Location[] = [
  { id: 'inn', name: 'The Inn Yard', level: 1 },
  { id: 'road', name: 'The North Road', level: 2 },
  { id: 'wood', name: 'The Old Wood', level: 3 },
  { id: 'coast', name: 'The Salt Coast', level: 4 },
  { id: 'ridge', name: 'Ember Ridge', level: 5 },
];

export const MATERIALS: Record<Material, { name: string; from: string }> = {
  iron: { name: 'Iron scrap', from: 'Might oaths' },
  herb: { name: 'Hearth herb', from: 'Grit oaths' },
  thread: { name: 'Wool thread', from: 'Craft oaths' },
  ink: { name: 'Ink drop', from: 'Wit oaths' },
  ember: { name: 'Ember shard', from: 'Rare, any oath' },
  gel: { name: 'Slime gel', from: 'The Slime of Later' },
};
export const STAT_MATERIAL: Record<Stat, Material> = { might: 'iron', wit: 'ink', grit: 'herb', craft: 'thread' };

// ---------------------------------------------------------------- gear
// Art parts refer to strips in public/assets/hero. A part ending in "_" gets
// the body suffix (m/f). Palettes recolour from the LPC base ramps.
export interface ArtLayer { part: string; z: number; pal?: 'cloth' | 'metal'; color?: string; }
export interface Gear { id: string; slot: Slot; name: string; price: number; source: 'start' | 'market' | 'forge' | 'boss'; bonus?: Partial<Mods>; bonusText?: string; art: ArtLayer[]; }

const shirt = (kind: 'long' | 'short', color: string): ArtLayer => ({ part: `shirt_${kind}_`, z: 35, pal: 'cloth', color });
const belt: ArtLayer = { part: 'belt_', z: 70 };
const cape = (color: string): ArtLayer[] => [{ part: 'cape_bg', z: 5, pal: 'cloth', color }, { part: 'cape_fg', z: 85, pal: 'cloth', color }];

export const GEAR: Gear[] = [
  // torso
  { id: 'tunic_linen', slot: 'torso', name: 'Linen Tunic', price: 0, source: 'start', art: [shirt('short', 'tan'), belt] },
  { id: 'tunic_moss', slot: 'torso', name: 'Moss Tunic', price: 0, source: 'start', art: [shirt('short', 'forest'), belt] },
  { id: 'wool_red', slot: 'torso', name: 'Red Wool Shirt', price: 0, source: 'start', art: [shirt('long', 'maroon'), belt] },
  { id: 'shirt_sky', slot: 'torso', name: 'Sky Shirt', price: 30, source: 'market', art: [shirt('long', 'sky'), belt] },
  { id: 'jerkin', slot: 'torso', name: 'Leather Jerkin', price: 80, source: 'market', bonus: { strike: 0.05 }, bonusText: '+5% strikes', art: [shirt('long', 'walnut'), { part: 'leather_', z: 60 }, belt] },
  { id: 'chain', slot: 'torso', name: 'Chain Shirt', price: 140, source: 'market', bonus: { strike: 0.1 }, bonusText: '+10% strikes', art: [shirt('long', 'charcoal'), { part: 'chain_', z: 50, pal: 'metal', color: 'iron' }, belt] },
  { id: 'plate', slot: 'torso', name: 'Hearthguard Plate', price: 0, source: 'forge', bonus: { maxHp: 15, strike: 0.1 }, bonusText: '+15 vitality, +10% strikes', art: [shirt('long', 'charcoal'), { part: 'plate_', z: 60, pal: 'metal', color: 'steel' }] },
  // cloak
  { id: 'cape_red', slot: 'cloak', name: 'Red Cloak', price: 45, source: 'market', bonus: { gold: 0.03 }, bonusText: '+3% gold', art: cape('red') },
  { id: 'cape_forest', slot: 'cloak', name: 'Forest Cloak', price: 45, source: 'market', bonus: { drop: 0.1 }, bonusText: '+10% drops', art: cape('forest') },
  { id: 'cape_navy', slot: 'cloak', name: 'Night Cloak', price: 60, source: 'market', bonus: { xp: 0.03 }, bonusText: '+3% XP', art: cape('navy') },
  { id: 'cape_ember', slot: 'cloak', name: 'Ember Cloak', price: 0, source: 'forge', bonus: { xp: 0.05, gold: 0.05 }, bonusText: '+5% XP and gold', art: cape('orange') },
  // head
  { id: 'hood_brown', slot: 'head', name: 'Traveller\'s Hood', price: 35, source: 'market', bonus: { missCut: 0.05 }, bonusText: 'Misses hurt 5% less', art: [{ part: 'hood', z: 130, pal: 'cloth', color: 'brown' }] },
  { id: 'hood_scholar', slot: 'head', name: 'Scholar\'s Hood', price: 0, source: 'forge', bonus: { xp: 0.05 }, bonusText: '+5% XP', art: [{ part: 'hood', z: 130, pal: 'cloth', color: 'navy' }] },
  { id: 'cap', slot: 'head', name: 'Leather Cap', price: 40, source: 'market', bonus: { gold: 0.02 }, bonusText: '+2% gold', art: [{ part: 'cap', z: 130 }] },
  { id: 'cap_feather', slot: 'head', name: 'Feathered Cap', price: 70, source: 'market', bonus: { gold: 0.05 }, bonusText: '+5% gold', art: [{ part: 'cap', z: 130 }, { part: 'cap_feather', z: 131 }] },
  { id: 'kettle', slot: 'head', name: 'Kettle Helm', price: 120, source: 'market', bonus: { strike: 0.06, maxHp: 5 }, bonusText: '+6% strikes, +5 vitality', art: [{ part: 'kettle', z: 135 }] },
  // legs
  { id: 'trousers_brown', slot: 'legs', name: 'Brown Trousers', price: 0, source: 'start', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'brown' }] },
  { id: 'trousers_slate', slot: 'legs', name: 'Slate Trousers', price: 0, source: 'start', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'slate' }] },
  { id: 'skirt_navy', slot: 'legs', name: 'Navy Skirt', price: 0, source: 'start', art: [{ part: 'skirt_', z: 20, pal: 'cloth', color: 'navy' }] },
  { id: 'trousers_teal', slot: 'legs', name: 'Teal Trousers', price: 25, source: 'market', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'teal' }] },
  { id: 'greaves', slot: 'legs', name: 'Plate Greaves', price: 150, source: 'market', bonus: { maxHp: 10 }, bonusText: '+10 vitality', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'charcoal' }, { part: 'greaves_', z: 21, pal: 'metal', color: 'steel' }] },
  // feet
  { id: 'shoes', slot: 'feet', name: 'Plain Shoes', price: 0, source: 'start', art: [{ part: 'shoes_', z: 15, pal: 'cloth', color: 'brown' }] },
  { id: 'boots', slot: 'feet', name: 'Walking Boots', price: 40, source: 'market', bonus: { comboWindow: 5 }, bonusText: 'Combo window +5 min', art: [{ part: 'boots_', z: 25, pal: 'cloth', color: 'leather' }] },
  { id: 'sabatons', slot: 'feet', name: 'Iron Sabatons', price: 120, source: 'market', bonus: { maxHp: 5, strike: 0.04 }, bonusText: '+5 vitality, +4% strikes', art: [{ part: 'sabatons_', z: 25, pal: 'metal', color: 'iron' }] },
];
export const gearById = (id: string) => GEAR.find((g) => g.id === id);

export interface Outfit { id: string; name: string; blurb: string; female: string[]; male: string[]; }
export const OUTFITS: Outfit[] = [
  { id: 'wayfarer', name: 'Wayfarer', blurb: 'Linen tunic, brown trousers, plain shoes', female: ['tunic_linen', 'trousers_brown', 'shoes'], male: ['tunic_linen', 'trousers_brown', 'shoes'] },
  { id: 'hearthkeeper', name: 'Hearthkeeper', blurb: 'Red wool, a navy skirt or slate trousers, boots', female: ['wool_red', 'skirt_navy', 'boots'], male: ['wool_red', 'trousers_slate', 'boots'] },
  { id: 'scout', name: 'Scout', blurb: 'Moss tunic, slate trousers, boots and a hood', female: ['tunic_moss', 'trousers_slate', 'boots', 'hood_brown'], male: ['tunic_moss', 'trousers_slate', 'boots', 'hood_brown'] },
];

// ---------------------------------------------------------------- familiars
export interface Familiar { id: string; name: string; kind: string; price: number; gift: string; mods: Partial<Mods>; dawnHeal?: number; }
export const FAMILIARS: Familiar[] = [
  { id: 'soot', name: 'Soot', kind: 'a hearth cat, coal-grey', price: 0, gift: 'Restores 2 vitality each dawn', mods: {}, dawnHeal: 2 },
  { id: 'pip', name: 'Pip', kind: 'a field mouse', price: 30, gift: '+10% drops', mods: { drop: 0.1 } },
  { id: 'inkling', name: 'Inkling', kind: 'a little raven', price: 45, gift: '+5% XP', mods: { xp: 0.05 } },
  { id: 'bramble', name: 'Bramble', kind: 'a red fox', price: 60, gift: '+5% gold', mods: { gold: 0.05 } },
  { id: 'hazel', name: 'Hazel', kind: 'a brown hound', price: 60, gift: '+8% strikes', mods: { strike: 0.08 } },
];
export const familiarById = (id: string) => FAMILIARS.find((f) => f.id === id);

// ---------------------------------------------------------------- forge
export interface Recipe { id: string; name: string; makes: { gear?: string; embers?: number; heal?: number }; needs: Partial<Record<Material, number>>; gold: number; text: string; }
export const RECIPES: Recipe[] = [
  { id: 'r_ember', name: 'Ember token', makes: { embers: 1 }, needs: { ember: 3 }, gold: 0, text: 'Forgives one missed daily. You can hold 3.' },
  { id: 'r_tonic', name: 'Hearth tonic', makes: { heal: 20 }, needs: { herb: 3 }, gold: 0, text: 'Restores 20 vitality now.' },
  { id: 'r_hood', name: 'Scholar\'s Hood', makes: { gear: 'hood_scholar' }, needs: { ink: 4, thread: 2 }, gold: 10, text: '+5% XP. A navy hood.' },
  { id: 'r_cloak', name: 'Ember Cloak', makes: { gear: 'cape_ember' }, needs: { thread: 4, ember: 2, gel: 2 }, gold: 20, text: '+5% XP and gold. Needs gel from the Slime of Later.' },
  { id: 'r_plate', name: 'Hearthguard Plate', makes: { gear: 'plate' }, needs: { iron: 8, ember: 1 }, gold: 40, text: '+15 vitality, +10% strikes.' },
];

export const REWARD_IDEAS = [
  { title: 'A good coffee', cost: 25 },
  { title: 'An hour of games, guilt-free', cost: 40 },
  { title: 'Takeaway night', cost: 90 },
];

export const MAX_EMBERS = 3;
export const REST_COST = 10;
export const REST_HEAL = 15;
export const KINDLE_COST = 40;
