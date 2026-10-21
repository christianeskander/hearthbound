import { describe, expect, it } from 'vitest';
import { addDays } from '../src/engine/time';
import { addOath, buyFamiliar, dayTurn, finishFocus, inviteBoss, keepDaily, startFocus, tapHabit, completeTodo } from '../src/engine/rules';
import { newSave, migrate, importBundle, exportFamily, persist, load, type Store } from '../src/engine/save';
import { CHAPTERS, canClaim, claimChapter, currentChapter, goalStates, syncStory } from '../src/engine/story';
import { addBond, patFamiliar, stageOf } from '../src/engine/pets';
import { TRACK, addSparks, rollSeason, seasonCloak } from '../src/engine/season';
import { BADGES, checkBadges } from '../src/engine/achievements';
import { addPause, endPause, isPaused } from '../src/engine/pause';
import { addChore, choreHp, nextStep, strikeChore, validateChore } from '../src/engine/chores';
import { gradeOf, lastWeekOf, weekReport } from '../src/engine/report';
import { buildIcs } from '../src/engine/ics';
import { parseFamily, newMemberId, saveKey, MAIN_ID } from '../src/engine/family';
import { phaseOf } from '../src/engine/phase';
import type { Save } from '../src/engine/types';

const T = (y: number, m: number, d: number, h = 9, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const never = () => 0.999;
const look = { sex: 'male' as const, skin: 'light', hair: 'plain', hairColor: 'black' };
function fresh(now = T(2026, 10, 21, 9), mode?: 'kid' | 'gentle'): Save {
  const s = newSave({ name: 'Christian', calling: 'warden', outfit: 'wayfarer', familiar: 'soot', look, mode }, now, never);
  if (!mode) s.oaths = [];
  s.dawn = null;
  return s;
}
const daily = (s: Save, now: number, title = 'Water', stat: 'grit' | 'wit' | 'might' | 'craft' = 'grit') =>
  addOath(s, { kind: 'daily', title, difficulty: 'easy', stat, days: [0, 1, 2, 3, 4, 5, 6] }, now, never);
const memStore = (): Store & { m: Map<string, string> } => { const m = new Map<string, string>(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }; };

/** A v3 save as v1.x wrote it: no v4 fields at all. */
function v3Save(): any {
  const d = T(2026, 10, 1, 9);
  const s = fresh(d);
  const a = daily(s, d, 'Water'), b = daily(s, d, 'Read', 'wit');
  addOath(s, { kind: 'habit', title: 'Walk', difficulty: 'easy', stat: 'might', up: true, down: false }, d, never);
  for (let i = 0; i < 12; i++) {
    const t = T(2026, 10, 1 + i, 7 + (i % 3));
    dayTurn(s, t);
    keepDaily(s, a.id, t, never);
    if (i % 2 === 0) keepDaily(s, b.id, t + 60000, never);
  }
  s.hero.gold += 100; buyFamiliar(s, 'pip', T(2026, 10, 12, 12));
  s.defeated = ['slime']; s.chronicle.unshift({ t: T(2026, 10, 8), text: 'Defeated The Slime of Later! +80 gold, +150 XP, 3 gel.', kind: 'boss' });
  const raw: any = JSON.parse(JSON.stringify(s));
  for (const k of ['mode', 'bonds', 'story', 'season', 'achievements', 'history', 'bossLog', 'chores', 'pauses', 'reportSeen']) delete raw[k];
  raw.chronicle = raw.chronicle.filter((c: any) => !['badge', 'pet', 'season', 'story'].includes(c.kind)); // v3 never wrote these
  delete raw.settings.reminder; delete raw.settings.noPenalty;
  raw.stats = { keeps: s.stats.keeps, slips: 0, misses: s.stats.misses, focusMinutes: 50, bossesDown: 1 };
  raw.version = 3;
  return raw;
}

describe('v3 -> v4 migration', () => {
  it('keeps every bit of v3 progress and rebuilds the new parts', () => {
    const raw = v3Save();
    const now = T(2026, 10, 13, 9);
    const s = migrate(raw, now);
    expect(s.version).toBe(4);
    // nothing lost
    expect(s.hero.level).toBe(raw.hero.level);
    expect(s.hero.xp).toBe(raw.hero.xp);
    expect(s.hero.gold).toBe(raw.hero.gold);
    expect(s.hero.gear).toEqual(raw.hero.gear);
    expect(s.hero.familiars).toEqual(raw.hero.familiars);
    expect(s.oaths.map((o) => [o.id, o.streak, o.bestStreak])).toEqual(raw.oaths.map((o: any) => [o.id, o.streak, o.bestStreak]));
    expect(s.chronicle.length).toBe(raw.chronicle.length);
    expect(s.defeated).toEqual(['slime']);
    expect(s.stats.keeps).toBe(raw.stats.keeps);
    expect(s.stats.focusMinutes).toBe(50);
    // rebuilt
    expect(s.mode).toBe('standard');
    expect(s.settings.noPenalty).toBe(false);
    expect(s.settings.reminder).toEqual({ on: false, time: '19:00' });
    expect(s.stats.dailyKeeps).toBe(raw.stats.keeps);
    expect(s.stats.statKeeps.wit).toBe(6);
    expect(Object.keys(s.history).length).toBeGreaterThanOrEqual(10);
    expect(s.history['2026-10-03'].kept).toBe(2);
    expect(s.bossLog).toEqual([expect.objectContaining({ id: 'slime', won: true })]);
    // owned familiars arrive Grown, so nothing they gave is taken away
    expect(stageOf(s, 'pip').name).toBe('Grown');
    expect(stageOf(s, 'soot').name).toBe('Grown');
    expect(s.bonds[s.hero.familiar]).toBe(10 + raw.stats.keeps);
    // badges already earned arrive quietly (no chronicle spam)
    expect(s.achievements.first_keep).toBeTruthy();
    expect(s.chronicle.some((c) => c.kind === 'badge')).toBe(false);
    expect(s.season.id).toBe('2026-10');
  });
  it('is stable: a v4 save survives a reload with all v4 fields', () => {
    const s = migrate(v3Save(), T(2026, 10, 13, 9));
    s.pauses.push({ from: '2026-10-20', to: '2026-10-22', why: 'away' });
    addChore(s, { name: 'Garage', steps: ['bin bags', 'one shelf'] }, T(2026, 10, 13, 9), never);
    addSparks(s, 30, '2026-10-13', T(2026, 10, 13, 9));
    const again = migrate(JSON.parse(JSON.stringify(s)), T(2026, 10, 13, 10));
    expect(again).toEqual(s);
  });
  it('a broken v4 field is cleaned, not fatal', () => {
    const s: any = JSON.parse(JSON.stringify(fresh()));
    s.chores = [{ name: 3 }, { name: 'ok', steps: [{ title: 'a' }] }];
    s.history = { bad: 1, '2026-10-01': { due: 'x', kept: 2 } };
    s.pauses = [{ from: 'nope' }];
    const m = migrate(s);
    expect(m.chores).toHaveLength(1);
    expect(m.history['2026-10-01']).toEqual({ due: 0, kept: 2, keeps: 0, xp: 0, gold: 0, focus: 0 });
    expect(m.pauses).toEqual([]);
  });
});

describe('story questline', () => {
  it('chapter 1 opens at once and counts only from when it opened', () => {
    const d = T(2026, 10, 21, 9);
    const s = fresh(d);
    const o = daily(s, d);
    syncStory(s);
    expect(currentChapter(s)!.n).toBe(1);
    for (let i = 0; i < 3; i++) { const t = T(2026, 10, 21 + i, 9); dayTurn(s, t); keepDaily(s, o.id, t, never); }
    expect(canClaim(s)?.n).toBe(1);
    const g = s.hero.gold;
    claimChapter(s, T(2026, 10, 23, 10));
    expect(s.hero.gold).toBe(g + CHAPTERS[0].reward.gold!);
    expect(currentChapter(s)!.n).toBe(2);
    expect(() => claimChapter(s, T(2026, 10, 23, 10))).toThrow();
  });
  it('a chapter above your level waits, and boss goals count past wins', () => {
    const s = fresh();
    s.story.claimed = [1, 2, 3]; syncStory(s);
    expect(currentChapter(s)!.n).toBe(4);
    expect(s.story.base).toBeNull(); // level 1 < 4
    s.hero.level = 4; s.defeated = ['slime']; syncStory(s);
    const gs = goalStates(s, currentChapter(s)!);
    expect(gs[0].done).toBe(true);
    expect(gs[1].done).toBe(false);
  });
});

describe('familiars grow', () => {
  it('Young -> Grown -> Bonded -> Elder as you keep oaths', () => {
    const s = fresh();
    expect(stageOf(s, 'soot').name).toBe('Young');
    let ev = null;
    for (let i = 0; i < 10; i++) ev = addBond(s, 1, 1) || ev;
    expect(ev!.stage.name).toBe('Grown');
    addBond(s, 50, 1);
    expect(stageOf(s, 'soot').gift).toBe(1.25);
    addBond(s, 140, 1);
    expect(stageOf(s, 'soot').name).toBe('Elder');
    expect(s.hero.titles).toContain('Friend of Elders');
  });
  it('a keep adds bond, and a pat works once a day', () => {
    const d = T(2026, 10, 21, 9);
    const s = fresh(d); const o = daily(s, d);
    keepDaily(s, o.id, d, never);
    expect(s.bonds.soot).toBe(1);
    expect(patFamiliar(s, d)).toBeNull();
    expect(patFamiliar(s, d)).toBe(false);
    expect(s.bonds.soot).toBe(2);
  });
  it('an Elder Soot mends more at dawn', () => {
    const d = T(2026, 10, 21, 9);
    const a = fresh(d), b = fresh(d);
    b.bonds.soot = 200;
    a.hero.hp = b.hero.hp = 10;
    dayTurn(a, T(2026, 10, 22, 9)); dayTurn(b, T(2026, 10, 22, 9));
    expect(b.hero.hp).toBeGreaterThan(a.hero.hp);
  });
});

describe('season pass', () => {
  it('sparks unlock the free track in order, and a new month starts fresh', () => {
    const s = fresh();
    const g = s.hero.gold;
    const got = addSparks(s, 10, '2026-10-21', 1);
    expect(got).toEqual([0]);
    expect(s.hero.gold).toBe(g + 3);
    addSparks(s, 300, '2026-10-21', 1);
    expect(s.season.got).toHaveLength(TRACK.length);
    expect(s.hero.gear).toContain(seasonCloak('2026-10'));
    rollSeason(s, '2026-11-01');
    expect(s.season).toEqual({ id: '2026-11', sparks: 0, got: [] });
    expect(s.hero.gear).toContain(seasonCloak('2026-10')); // you keep what you earned
  });
  it('keeping a daily earns sparks', () => {
    const d = T(2026, 10, 21, 9); const s = fresh(d); const o = daily(s, d);
    keepDaily(s, o.id, d, never);
    expect(s.season.sparks).toBeGreaterThanOrEqual(2);
  });
});

describe('achievements', () => {
  it('there are at least 20, with unique ids', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
  it('the first 30-day streak earns Moon-Long Flame, once', () => {
    const s = fresh(); const o = daily(s, T(2026, 10, 21));
    o.bestStreak = 30;
    expect(checkBadges(s, 5).map((b) => b.id)).toContain('streak_30');
    expect(checkBadges(s, 6).map((b) => b.id)).not.toContain('streak_30');
    expect(s.chronicle[0].kind).toBe('badge');
  });
  it('first keep shows up in the keep result', () => {
    const d = T(2026, 10, 21, 9); const s = fresh(d); const o = daily(s, d);
    const r = keepDaily(s, o.id, d, never);
    expect(r.badges.map((b) => b.id)).toContain('first_keep');
  });
});

describe('rest days (vacation / sick)', () => {
  it('a rest day freezes streaks, vitality and boss damage', () => {
    const d = T(2026, 10, 21, 9);
    const s = fresh(d); const o = daily(s, d);
    keepDaily(s, o.id, d, never);
    inviteBoss(s, 'slime', d);
    s.hero.embers = 0;
    addPause(s, '2026-10-22', '2026-10-24', 'sick', '2026-10-21');
    const hp = s.hero.hp;
    const r = dayTurn(s, T(2026, 10, 25, 9))!; // the 22nd, 23rd and 24th were rest days
    expect(o.streak).toBe(1);
    expect(r.bossHits).toBe(0);
    expect(s.hero.hp).toBeGreaterThanOrEqual(hp);
    expect(r.rested).toBeGreaterThan(0);
    expect(s.history['2026-10-23'].paused).toBe(true);
    expect(s.stats.restDays).toBe(3);
  });
  it('without a rest, the same nights would cost', () => {
    const d = T(2026, 10, 21, 9);
    const s = fresh(d); const o = daily(s, d);
    keepDaily(s, o.id, d, never); s.hero.embers = 0;
    dayTurn(s, T(2026, 10, 25, 9));
    expect(o.streak).toBe(0);
  });
  it('cannot rest the past; can end early; merges overlaps', () => {
    const s = fresh();
    expect(() => addPause(s, '2026-10-20', '2026-10-22', 'away', '2026-10-21')).toThrow();
    addPause(s, '2026-10-22', '2026-10-24', 'away', '2026-10-21');
    addPause(s, '2026-10-24', '2026-10-27', 'away', '2026-10-21');
    expect(s.pauses).toEqual([{ from: '2026-10-22', to: '2026-10-27', why: 'away' }]);
    endPause(s, '2026-10-22', '2026-10-25');
    expect(isPaused(s, '2026-10-24')).toBe(true);
    expect(isPaused(s, '2026-10-25')).toBe(false);
  });
  it('kid heroes never lose anything for a missed night', () => {
    const d = T(2026, 10, 21, 9);
    const s = fresh(d, 'kid');
    expect(s.settings.noPenalty).toBe(true);
    expect(s.oaths.every((o) => o.icon)).toBe(true);
    const o = s.oaths[0];
    keepDaily(s, o.id, d, never);
    const hp = s.hero.hp;
    dayTurn(s, T(2026, 10, 25, 9));
    expect(o.streak).toBe(1);
    expect(s.hero.hp).toBeGreaterThanOrEqual(hp);
  });
  it('gentle heroes start with tiny one-tap wins', () => {
    const s = fresh(T(2026, 10, 21, 9), 'gentle');
    expect(s.oaths.every((o) => o.kind === 'habit' && o.up && !o.down && o.difficulty === 'trivial')).toBe(true);
    const r = tapHabit(s, s.oaths[0].id, 1, T(2026, 10, 21, 9), never);
    expect(r.payout.gold).toBeGreaterThan(0);
  });
});

describe('chore bosses', () => {
  it('a big task is a foe whose hp is its steps', () => {
    const d = T(2026, 10, 21, 9);
    const s = fresh(d);
    expect(validateChore({ name: 'Garage', steps: ['one'] })).toMatch(/at least 2/);
    const c = addChore(s, { name: 'The Garage', steps: ['Bin bags', 'Clear one shelf', 'Sweep'] }, d, never);
    expect(choreHp(c)).toBe(3);
    const g0 = s.hero.gold;
    const r1 = strikeChore(s, c.id, nextStep(c)!.id, d, never);
    expect(r1.payout.gold).toBeGreaterThan(0);
    expect(choreHp(c)).toBe(2);
    strikeChore(s, c.id, nextStep(c)!.id, d + 1000, never);
    const last = strikeChore(s, c.id, nextStep(c)!.id, d + 2000, never);
    expect(last.choreDown?.id).toBe(c.id);
    expect(last.bonus).toEqual({ gold: 6, xp: 18 });
    expect(s.hero.titles).toContain('Chore Slayer');
    expect(s.stats.choreBosses).toBe(1);
    expect(s.hero.gold).toBeGreaterThan(g0 + 6);
    expect(() => strikeChore(s, c.id, c.steps[0].id, d, never)).toThrow();
  });
});

describe('weekly report card', () => {
  it('grades in words and finds the best day and what slipped, gently', () => {
    const s = fresh(T(2026, 10, 12, 9));
    const a = daily(s, T(2026, 10, 12, 9), 'Water'), b = daily(s, T(2026, 10, 12, 9), 'Stretch');
    for (let i = 0; i < 7; i++) {
      const t = T(2026, 10, 12 + i, 9);
      dayTurn(s, t);
      keepDaily(s, a.id, t, never);
      if (i === 2) keepDaily(s, b.id, t, never);
    }
    dayTurn(s, T(2026, 10, 20, 9));
    expect(lastWeekOf('2026-10-20')).toBe('2026-10-12');
    const w = weekReport(s, '2026-10-12');
    expect(w.kept).toBe(8);
    expect(w.best?.day).toBe('2026-10-14');
    expect(w.slipped.map((x) => x.title)).toContain('Stretch');
    expect(['warm', 'kindling']).toContain(w.grade);
    expect(w.message).not.toMatch(/fail|bad|lazy/i);
    expect(gradeOf(9, 10)).toBe('blazing');
    expect(gradeOf(0, 0)).toBe('resting');
  });
});

describe('reminders file, family, phases', () => {
  it('builds a valid daily recurring .ics', () => {
    const ics = buildIcs({ time: '19:30', url: 'https://christianeskander.github.io/hearthbound/?action=next', name: 'Christian', start: new Date(2026, 9, 22), uid: 'x@hb', now: new Date(Date.UTC(2026, 9, 22)) });
    expect(ics).toContain('DTSTART:20261022T193000');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(() => buildIcs({ time: '25:00', url: '', name: '', start: new Date(), uid: 'x' })).toThrow();
  });
  it('family index: main hero keeps the old key; each hero has its own save', () => {
    const f = parseFamily(null, true);
    expect(f.members.map((m) => m.id)).toEqual([MAIN_ID]);
    expect(saveKey(MAIN_ID)).toBe('hearthbound.save');
    const id = newMemberId(f, () => 0.5);
    expect(id).not.toBe(MAIN_ID);
    const st = memStore();
    const kid = fresh(T(2026, 10, 21), 'kid'); kid.hero.name = 'Emma';
    const dad = fresh(); 
    persist(st, dad, saveKey(MAIN_ID)); persist(st, kid, saveKey(id));
    expect(load(st, T(2026, 10, 21), saveKey(id)).save!.hero.name).toBe('Emma');
    expect(load(st, T(2026, 10, 21)).save!.hero.name).toBe('Christian');
    const b = importBundle(exportFamily([{ id: MAIN_ID, name: 'Christian', mode: 'standard', save: dad }, { id, name: 'Emma', mode: 'kid', save: kid }]));
    expect(b.kind).toBe('family');
    if (b.kind === 'family') expect(b.heroes.map((h) => h.save.mode)).toEqual(['standard', 'kid']);
  });
  it('dawn, day, dusk, night', () => {
    expect([5, 9, 18, 22, 2].map(phaseOf)).toEqual(['dawn', 'day', 'dusk', 'night', 'night']);
  });
  it('focus and errands feed history', () => {
    const d = T(2026, 10, 21, 9); const s = fresh(d);
    const t = addOath(s, { kind: 'todo', title: 'Post', difficulty: 'easy', stat: 'craft' }, d, never);
    completeTodo(s, t.id, d, never);
    startFocus(s, 25, d);
    finishFocus(s, d + 25 * 60000, never);
    expect(s.history['2026-10-21'].focus).toBe(25);
    expect(s.history['2026-10-21'].keeps).toBe(1);
    expect(s.stats.todos).toBe(1);
    expect(addDays('2026-10-21', 0)).toBe('2026-10-21');
  });
});
