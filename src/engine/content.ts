import type { Difficulty, Material, Slot, Stat } from './types';

export const DIFF: Record<Difficulty, { label: string; xp: number; gold: number; mana: number; strike: number; hurt: number }> = {
  trivial: { label: 'Tiny', xp: 4, gold: 1, mana: 1, strike: 2, hurt: 1 },
  easy: { label: 'Easy', xp: 8, gold: 2, mana: 1, strike: 4, hurt: 3 },
  medium: { label: 'Steady', xp: 14, gold: 4, mana: 2, strike: 6, hurt: 4 },
  hard: { label: 'Hard', xp: 22, gold: 7, mana: 3, strike: 9, hurt: 6 },
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

export interface Boss { id: string; name: string; blurb: string; hp: number; power: number; gold: number; xp: number; title: string; drop: [Material, number]; location: string; needs?: string; theme?: string; }
// The first two are the v1/v3 foes (balance from commit 98b5c52, unchanged). The v2 foes are
// the everyday shapes of procrastination and executive dysfunction. Each one waits for the
// last, and their gold per point of health is lower, so the market still takes months.
export const BOSSES: Boss[] = [
  { id: 'slime', name: 'The Slime of Later', blurb: 'Always one step ahead, saying "tomorrow". Every keep is a strike. Every missed daily lets it splash you back.', hp: 130, power: 1, gold: 80, xp: 150, title: 'Breaker of Later', drop: ['gel', 3], location: 'wood' },
  { id: 'rat', name: 'The Gnawing Doubt', blurb: 'A big grey rat that chews on good intentions. Tougher, and it bites harder.', hp: 260, power: 2, gold: 160, xp: 300, title: 'Quiet Mind', drop: ['ember', 2], location: 'road', needs: 'slime' },
  { id: 'drift', name: 'The Drift', blurb: 'A cold blue slime that swallows hours. You sit down for five minutes and it is dark outside. Keeps pull you back to now.', hp: 360, power: 1, gold: 25, xp: 200, title: 'Keeper of Hours', drop: ['ink', 3], location: 'coast', needs: 'rat', theme: 'Time blindness' },
  { id: 'maybe', name: 'The Mushroom of Maybe', blurb: 'It grows wherever a choice is left unmade. Ten options, no start. Every keep picks one and walks.', hp: 460, power: 1, gold: 30, xp: 240, title: 'The Decider', drop: ['herb', 4], location: 'wood', needs: 'drift', theme: 'Decision paralysis' },
  { id: 'gleam', name: 'The Gleam of Perfect', blurb: 'A red slime that polishes and polishes and never ships. "If it is not perfect, why start?" Done beats perfect, every time.', hp: 580, power: 1, gold: 35, xp: 280, title: 'Good Enough', drop: ['ember', 3], location: 'inn', needs: 'maybe', theme: 'Perfectionism' },
  { id: 'weight', name: 'The Weight of Everything', blurb: 'A bear that sits on your chest when the list is too long to look at. You do not lift it all at once. One small thing, then the next.', hp: 720, power: 1, gold: 40, xp: 320, title: 'Unburdened', drop: ['iron', 5], location: 'ridge', needs: 'gleam', theme: 'Overwhelm and freeze' },
];
export const bossById = (id: string) => BOSSES.find((b) => b.id === id);

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
export interface Gear { id: string; slot: Slot; name: string; price: number; source: 'start' | 'market' | 'forge' | 'boss' | 'season' | 'story'; bonus?: Partial<Mods>; bonusText?: string; art: ArtLayer[]; }

const shirt = (kind: 'long' | 'short', color: string): ArtLayer => ({ part: `shirt_${kind}_`, z: 35, pal: 'cloth', color });
const belt: ArtLayer = { part: 'belt_', z: 70 };
const cape = (color: string): ArtLayer[] => [{ part: 'cape_bg', z: 5, pal: 'cloth', color }, { part: 'cape_fg', z: 85, pal: 'cloth', color }];

// ---------------------------------------------------------------- seasons (v2)
// One theme per calendar month. Words, not weather, so they suit Sydney and Stockholm alike.
export interface SeasonTheme { name: string; blurb: string; color: string; cloak: string; accent: string; }
export const SEASON_THEMES: SeasonTheme[] = [
  { name: 'The Fresh Page', blurb: 'A clean page and one line on it.', color: 'white', cloak: 'Fresh Page Cloak', accent: '#e9e3d6' },
  { name: 'Heartfire', blurb: 'Small kindnesses, kept warm.', color: 'rose', cloak: 'Heartfire Cloak', accent: '#e58aa0' },
  { name: 'The Kite Wind', blurb: 'Let the day lift you a little.', color: 'sky', cloak: 'Kite Wind Cloak', accent: '#8cc8f0' },
  { name: 'Lantern Rain', blurb: 'Rain on the roof, a light in the window.', color: 'bluegray', cloak: 'Rain-Lantern Cloak', accent: '#9fb3c8' },
  { name: 'Honey and Smoke', blurb: 'Slow mornings and a good fire.', color: 'yellow', cloak: 'Honeyed Cloak', accent: '#f0c860' },
  { name: 'The Long Night', blurb: 'The longest dark, and the stars in it.', color: 'navy', cloak: 'Long Night Cloak', accent: '#7f95e0' },
  { name: 'Wool and Embers', blurb: 'Warm socks, warm hands, warm hearth.', color: 'maroon', cloak: 'Woollen Cloak', accent: '#c46a6a' },
  { name: 'The Turning Wheel', blurb: 'Round and round; each turn counts.', color: 'teal', cloak: 'Wheelwright Cloak', accent: '#5fc0b0' },
  { name: 'Wildflower Road', blurb: 'Things grow where you keep walking.', color: 'green', cloak: 'Wildflower Cloak', accent: '#8fd070' },
  { name: 'The Lantern Fair', blurb: 'Every keep hangs another lantern.', color: 'orange', cloak: 'Lantern Fair Cloak', accent: '#f0a050' },
  { name: 'Salt and Starlight', blurb: 'Sea air and a sky full of small lights.', color: 'blue', cloak: 'Starlight Cloak', accent: '#6fa0f0' },
  { name: 'The Gift Fire', blurb: 'The year ends warm. You made it here.', color: 'red', cloak: 'Gift Fire Cloak', accent: '#e86a5a' },
];
function SEASON_CLOAKS(): Gear[] {
  return SEASON_THEMES.map((th, i) => ({ id: `cape_season_${i + 1}`, slot: 'cloak' as Slot, name: th.cloak, price: 0, source: 'season' as const, bonusText: `Season reward: ${th.name}`, art: cape(th.color) }));
}

export const GEAR: Gear[] = [
  // torso
  { id: 'tunic_linen', slot: 'torso', name: 'Linen Tunic', price: 0, source: 'start', art: [shirt('short', 'tan'), belt] },
  { id: 'tunic_moss', slot: 'torso', name: 'Moss Tunic', price: 0, source: 'start', art: [shirt('short', 'forest'), belt] },
  { id: 'wool_red', slot: 'torso', name: 'Red Wool Shirt', price: 0, source: 'start', art: [shirt('long', 'maroon'), belt] },
  { id: 'shirt_sky', slot: 'torso', name: 'Sky Shirt', price: 30, source: 'market', art: [shirt('long', 'sky'), belt] },
  { id: 'jerkin', slot: 'torso', name: 'Leather Jerkin', price: 150, source: 'market', bonus: { strike: 0.05 }, bonusText: '+5% strikes', art: [shirt('long', 'walnut'), { part: 'leather_', z: 60 }, belt] },
  { id: 'chain', slot: 'torso', name: 'Chain Shirt', price: 280, source: 'market', bonus: { strike: 0.1 }, bonusText: '+10% strikes', art: [shirt('long', 'charcoal'), { part: 'chain_', z: 50, pal: 'metal', color: 'iron' }, belt] },
  { id: 'plate', slot: 'torso', name: 'Hearthguard Plate', price: 0, source: 'forge', bonus: { maxHp: 15, strike: 0.1 }, bonusText: '+15 vitality, +10% strikes', art: [shirt('long', 'charcoal'), { part: 'plate_', z: 60, pal: 'metal', color: 'steel' }] },
  // cloak
  { id: 'cape_red', slot: 'cloak', name: 'Red Cloak', price: 90, source: 'market', bonus: { gold: 0.03 }, bonusText: '+3% gold', art: cape('red') },
  { id: 'cape_forest', slot: 'cloak', name: 'Forest Cloak', price: 90, source: 'market', bonus: { drop: 0.1 }, bonusText: '+10% drops', art: cape('forest') },
  { id: 'cape_navy', slot: 'cloak', name: 'Night Cloak', price: 120, source: 'market', bonus: { xp: 0.03 }, bonusText: '+3% XP', art: cape('navy') },
  { id: 'cape_ember', slot: 'cloak', name: 'Ember Cloak', price: 0, source: 'forge', bonus: { xp: 0.05, gold: 0.05 }, bonusText: '+5% XP and gold', art: cape('orange') },
  // v2: cosmetic cloaks from the story and the monthly season track (no bonus, so the economy is unchanged)
  { id: 'cape_story', slot: 'cloak', name: 'Storyteller\'s Cloak', price: 0, source: 'story', bonusText: 'From the story: the hearth restored', art: cape('lavender') },
  ...SEASON_CLOAKS(),
  // head
  { id: 'hood_brown', slot: 'head', name: 'Traveller\'s Hood', price: 70, source: 'market', bonus: { missCut: 0.05 }, bonusText: 'Misses hurt 5% less', art: [{ part: 'hood', z: 130, pal: 'cloth', color: 'brown' }] },
  { id: 'hood_scholar', slot: 'head', name: 'Scholar\'s Hood', price: 0, source: 'forge', bonus: { xp: 0.05 }, bonusText: '+5% XP', art: [{ part: 'hood', z: 130, pal: 'cloth', color: 'navy' }] },
  { id: 'cap', slot: 'head', name: 'Leather Cap', price: 80, source: 'market', bonus: { gold: 0.02 }, bonusText: '+2% gold', art: [{ part: 'cap', z: 130 }] },
  { id: 'cap_feather', slot: 'head', name: 'Feathered Cap', price: 140, source: 'market', bonus: { gold: 0.05 }, bonusText: '+5% gold', art: [{ part: 'cap', z: 130 }, { part: 'cap_feather', z: 131 }] },
  { id: 'kettle', slot: 'head', name: 'Kettle Helm', price: 240, source: 'market', bonus: { strike: 0.06, maxHp: 5 }, bonusText: '+6% strikes, +5 vitality', art: [{ part: 'kettle', z: 135 }] },
  // legs
  { id: 'trousers_brown', slot: 'legs', name: 'Brown Trousers', price: 0, source: 'start', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'brown' }] },
  { id: 'trousers_slate', slot: 'legs', name: 'Slate Trousers', price: 0, source: 'start', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'slate' }] },
  { id: 'skirt_navy', slot: 'legs', name: 'Navy Skirt', price: 0, source: 'start', art: [{ part: 'skirt_', z: 20, pal: 'cloth', color: 'navy' }] },
  { id: 'trousers_teal', slot: 'legs', name: 'Teal Trousers', price: 25, source: 'market', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'teal' }] },
  { id: 'greaves', slot: 'legs', name: 'Plate Greaves', price: 300, source: 'market', bonus: { maxHp: 10 }, bonusText: '+10 vitality', art: [{ part: 'pants_', z: 20, pal: 'cloth', color: 'charcoal' }, { part: 'greaves_', z: 21, pal: 'metal', color: 'steel' }] },
  // feet
  { id: 'shoes', slot: 'feet', name: 'Plain Shoes', price: 0, source: 'start', art: [{ part: 'shoes_', z: 15, pal: 'cloth', color: 'brown' }] },
  { id: 'boots', slot: 'feet', name: 'Walking Boots', price: 80, source: 'market', bonus: { comboWindow: 5 }, bonusText: 'Combo window +5 min', art: [{ part: 'boots_', z: 25, pal: 'cloth', color: 'leather' }] },
  { id: 'sabatons', slot: 'feet', name: 'Iron Sabatons', price: 240, source: 'market', bonus: { maxHp: 5, strike: 0.04 }, bonusText: '+5 vitality, +4% strikes', art: [{ part: 'sabatons_', z: 25, pal: 'metal', color: 'iron' }] },
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
  { id: 'soot', name: 'Soot', kind: 'a hearth cat, coal-grey', price: 0, gift: 'Mends 2 extra vitality each dawn', mods: {}, dawnHeal: 2 },
  { id: 'pip', name: 'Pip', kind: 'a field mouse', price: 50, gift: '+10% drops', mods: { drop: 0.1 } },
  { id: 'inkling', name: 'Inkling', kind: 'a little raven', price: 70, gift: '+5% XP', mods: { xp: 0.05 } },
  { id: 'bramble', name: 'Bramble', kind: 'a red fox', price: 90, gift: '+5% gold', mods: { gold: 0.05 } },
  { id: 'hazel', name: 'Hazel', kind: 'a brown hound', price: 90, gift: '+8% strikes', mods: { strike: 0.08 } },
];
export const familiarById = (id: string) => FAMILIARS.find((f) => f.id === id);

/**
 * v2: familiars grow as you keep oaths (bond points). A Young familiar walks a little
 * smaller; Bonded and Elder familiars give 25% / 50% more of their gift. Every familiar
 * from a v1 save starts at Grown, so nobody's bonuses change on the update.
 */
export interface FamiliarStage { id: number; name: string; at: number; gift: number; scale: number; text: string; }
export const FAMILIAR_STAGES: FamiliarStage[] = [
  { id: 0, name: 'Young', at: 0, gift: 1, scale: 0.75, text: 'Small and curious. Keep oaths together and it grows.' },
  { id: 1, name: 'Grown', at: 10, gift: 1, scale: 1, text: 'Full size, and sure of you.' },
  { id: 2, name: 'Bonded', at: 60, gift: 1.25, scale: 1, text: 'It knows your rhythms. Its gift is 25% stronger.' },
  { id: 3, name: 'Elder', at: 200, gift: 1.5, scale: 1, text: 'An old friend with a glow about it. Its gift is 50% stronger.' },
];
/** Bond for a keep (daily, errand, chore step, first + on a habit), and for a pat once a day. */
export const BOND_KEEP = 1;
export const BOND_PAT = 1;

// ---------------------------------------------------------------- forge
export interface Recipe { id: string; name: string; makes: { gear?: string; embers?: number; heal?: number }; needs: Partial<Record<Material, number>>; gold: number; text: string; }
export const RECIPES: Recipe[] = [
  { id: 'r_ember', name: 'Ember token', makes: { embers: 1 }, needs: { ember: 3 }, gold: 0, text: 'Forgives one missed daily. You can hold 3.' },
  { id: 'r_tonic', name: 'Hearth tonic', makes: { heal: 20 }, needs: { herb: 3 }, gold: 0, text: 'Restores 20 vitality now.' },
  { id: 'r_hood', name: 'Scholar\'s Hood', makes: { gear: 'hood_scholar' }, needs: { ink: 4, thread: 2 }, gold: 10, text: '+5% XP. A navy hood.' },
  { id: 'r_cloak', name: 'Ember Cloak', makes: { gear: 'cape_ember' }, needs: { thread: 4, ember: 2, gel: 2 }, gold: 20, text: '+5% XP and gold. Needs gel from the Slime of Later.' },
  { id: 'r_plate', name: 'Hearthguard Plate', makes: { gear: 'plate' }, needs: { iron: 8, ember: 1 }, gold: 40, text: '+15 vitality, +10% strikes.' },
];

export const KID_REWARD_IDEAS = [
  { title: '🌟 A sticker', cost: 5 },
  { title: '📖 An extra story at bedtime', cost: 12 },
  { title: '🛝 A trip to the park', cost: 30 },
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

// ---------------------------------------------------------------- balance knobs (see balance.md)
/** Streak bonus per day kept in a row, and the day it stops growing (+30% at 12 days). */
export const STREAK_STEP = 0.025;
export const STREAK_CAP_DAYS = 12;
/** Rekindle: a daily missed on recent nights pays +25% per miss in a row (up to +75%) when you come back to it. */
export const COLD_STEP = 0.25;
export const COLD_MAX = 3;
/** Each extra + on the same habit in one day pays less: x0.6 per tap, never below x0.1. */
export const HABIT_FADE = 0.6;
export const HABIT_FLOOR = 0.1;
/** Everyone mends a little at dawn; no single dawn takes more than this share of max vitality. */
export const DAWN_MEND = 2;
export const NIGHT_CAP = 0.4;
/** Keeping a daily or finishing an errand warms you: +1 vitality. */
export const KEEP_WARMTH = 1;
