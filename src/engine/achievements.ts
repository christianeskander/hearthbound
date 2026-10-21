// Badges for milestones. Each is a pure check on the save, so old sagas earn
// the ones they already deserve the first time v4 opens them.
import { BOSSES } from './content';
import { stageOf } from './pets';
import { TRACK } from './season';
import type { Save } from './types';

export interface Badge { id: string; name: string; text: string; icon: string; tier: 'bronze' | 'silver' | 'gold'; test: (s: Save) => boolean; }

const best = (s: Save) => Math.max(0, ...s.oaths.map((o) => o.bestStreak));
const anyStage = (s: Save, n: number) => s.hero.familiars.some((f) => stageOf(s, f).id >= n);

export const BADGES: Badge[] = [
  { id: 'first_keep', name: 'First Spark', text: 'Keep your first oath.', icon: 'flame', tier: 'bronze', test: (s) => s.stats.keeps >= 1 },
  { id: 'keeps_50', name: 'Kindling Pile', text: 'Keep 50 oaths.', icon: 'flame', tier: 'bronze', test: (s) => s.stats.keeps >= 50 },
  { id: 'keeps_250', name: 'Steady Fire', text: 'Keep 250 oaths.', icon: 'flame', tier: 'silver', test: (s) => s.stats.keeps >= 250 },
  { id: 'keeps_1000', name: 'Thousand Fires', text: 'Keep 1,000 oaths.', icon: 'flame', tier: 'gold', test: (s) => s.stats.keeps >= 1000 },
  { id: 'streak_7', name: 'A Week Unbroken', text: 'Keep one daily 7 days in a row.', icon: 'star', tier: 'bronze', test: (s) => best(s) >= 7 },
  { id: 'streak_30', name: 'Moon-Long Flame', text: 'Your first 30-day streak.', icon: 'moon', tier: 'silver', test: (s) => best(s) >= 30 },
  { id: 'streak_100', name: 'Hundred Nights', text: 'A 100-day streak on one daily.', icon: 'crown', tier: 'gold', test: (s) => best(s) >= 100 },
  { id: 'perfect_1', name: 'Clean Sweep', text: 'Keep every daily due in one day.', icon: 'check', tier: 'bronze', test: (s) => s.stats.perfectDays >= 1 },
  { id: 'perfect_10', name: 'Ten Bright Days', text: 'Ten days with every daily kept.', icon: 'sun', tier: 'silver', test: (s) => s.stats.perfectDays >= 10 },
  { id: 'perfect_50', name: 'Lighthouse', text: 'Fifty clean-sweep days.', icon: 'sun', tier: 'gold', test: (s) => s.stats.perfectDays >= 50 },
  { id: 'comeback', name: 'Welcome Back', text: 'Pick a missed daily back up.', icon: 'heart', tier: 'bronze', test: (s) => s.stats.rekindles >= 1 },
  { id: 'phoenix', name: 'Phoenix', text: 'Rekindle 15 times. Coming back is the skill.', icon: 'ember', tier: 'silver', test: (s) => s.stats.rekindles >= 15 },
  { id: 'boss_1', name: 'Foe-Breaker', text: 'Beat your first foe.', icon: 'sword', tier: 'bronze', test: (s) => s.stats.bossesDown >= 1 },
  { id: 'boss_all', name: 'Every Shadow Named', text: `Beat all ${BOSSES.length} foes of the road.`, icon: 'shield', tier: 'gold', test: (s) => BOSSES.every((b) => s.defeated.includes(b.id)) },
  { id: 'level_5', name: 'Hearthwarden', text: 'Reach level 5.', icon: 'xp', tier: 'bronze', test: (s) => s.hero.level >= 5 },
  { id: 'level_10', name: 'Lantern-bearer', text: 'Reach level 10.', icon: 'xp', tier: 'silver', test: (s) => s.hero.level >= 10 },
  { id: 'level_20', name: 'Old Flame', text: 'Reach level 20.', icon: 'crown', tier: 'gold', test: (s) => s.hero.level >= 20 },
  { id: 'focus_1', name: 'First Rite', text: 'Finish a focus rite.', icon: 'clock', tier: 'bronze', test: (s) => s.stats.rites >= 1 || s.stats.focusMinutes >= 15 },
  { id: 'focus_600', name: 'Ten Quiet Hours', text: '600 minutes of focus rites.', icon: 'clock', tier: 'silver', test: (s) => s.stats.focusMinutes >= 600 },
  { id: 'todo_1', name: 'Loose End', text: 'Finish an errand.', icon: 'scroll', tier: 'bronze', test: (s) => s.stats.todos >= 1 },
  { id: 'todo_25', name: 'Loose Ends Tied', text: 'Finish 25 errands.', icon: 'scroll', tier: 'silver', test: (s) => s.stats.todos >= 25 },
  { id: 'chore_1', name: 'Chore Slayer', text: 'Beat a big task you turned into a foe.', icon: 'sword', tier: 'bronze', test: (s) => s.stats.choreBosses >= 1 },
  { id: 'chore_5', name: 'Big Task Hunter', text: 'Beat five big-task foes.', icon: 'shield', tier: 'silver', test: (s) => s.stats.choreBosses >= 5 },
  { id: 'pet_bonded', name: 'Bonded', text: 'A familiar grows to Bonded.', icon: 'paw', tier: 'silver', test: (s) => anyStage(s, 2) },
  { id: 'pet_elder', name: 'Friend of Elders', text: 'A familiar grows to Elder.', icon: 'paw', tier: 'gold', test: (s) => anyStage(s, 3) },
  { id: 'treat', name: 'Treat Yourself', text: 'Spend gold on a real reward.', icon: 'coin', tier: 'bronze', test: (s) => s.stats.rewardsBought >= 1 },
  { id: 'forge_1', name: 'Smith\'s Apprentice', text: 'Forge something.', icon: 'ember', tier: 'bronze', test: (s) => s.stats.forged >= 1 },
  { id: 'early', name: 'Early Lantern', text: 'Ten keeps before 8am.', icon: 'sun', tier: 'bronze', test: (s) => s.stats.earlyKeeps >= 10 },
  { id: 'rest', name: 'Rest Is Part of It', text: 'Take a rest day when you need one.', icon: 'moon', tier: 'bronze', test: (s) => s.stats.restDays >= 1 },
  { id: 'season', name: 'Season Complete', text: 'Finish a month\'s season track.', icon: 'star', tier: 'silver', test: (s) => s.season.got.length >= TRACK.length },
  { id: 'story_3', name: 'Page Turner', text: 'Finish three story chapters.', icon: 'book', tier: 'bronze', test: (s) => s.story.claimed.length >= 3 },
  { id: 'story_done', name: 'The Hearth Restored', text: 'Finish the story.', icon: 'book', tier: 'gold', test: (s) => s.story.claimed.length >= 8 },
  { id: 'gold_1000', name: 'Full Purse', text: 'Earn 1,000 gold in total.', icon: 'coin', tier: 'silver', test: (s) => s.stats.goldTotal >= 1000 },
];

/** Unlocks any badges now earned. Returns the newly earned ones (none twice). */
export function checkBadges(s: Save, now: number, quiet = false): Badge[] {
  const out: Badge[] = [];
  for (const b of BADGES) {
    if (s.achievements[b.id]) continue;
    if (b.test(s)) {
      s.achievements[b.id] = now;
      out.push(b);
      if (!quiet) s.chronicle.unshift({ t: now, text: `Badge: ${b.name}. ${b.text}`, kind: 'badge' });
    }
  }
  return out;
}
