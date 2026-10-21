// Builds a demo family on the real engine (for screenshots): `vite-node tools/seed.ts out.json`
import { writeFileSync } from 'node:fs';
import { newSave } from '../src/engine/save';
import { addOath, completeTodo, dayTurn, inviteBoss, isDueOn, keepDaily, tapHabit, today, finishFocus, startFocus } from '../src/engine/rules';
import { addChore, strikeChore, nextStep } from '../src/engine/chores';
import { addPause } from '../src/engine/pause';
import { canClaim, claimChapter, syncStory } from '../src/engine/story';
import { BOSSES } from '../src/engine/content';
import { saveKey, FAMILY_KEY } from '../src/engine/family';
import type { Save } from '../src/engine/types';

let seed = 42;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const NOW = Date.now();
const DAY = 86400000;
const at = (daysAgo: number, h: number, m = 0) => { const d = new Date(NOW - daysAgo * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
const all = [0, 1, 2, 3, 4, 5, 6];
const safe = (f: () => unknown) => { try { f(); } catch { /* already kept that hearth day */ } };

function christian(): Save {
  const start = at(45, 9);
  const s = newSave({ name: 'Christian', calling: 'pathfinder', outfit: 'wayfarer', familiar: 'soot', look: { sex: 'male', skin: 'light', hair: 'messy', hairColor: 'black' } }, start, rng);
  s.oaths = [];
  for (const [t, st, df] of [['Take meds with breakfast', 'grit', 'easy'], ['Drink a glass of water', 'grit', 'trivial'], ['Read 10 pages', 'wit', 'easy'], ['Stretch for 5 minutes', 'might', 'easy'], ['Lights out by 11', 'grit', 'medium']] as const)
    addOath(s, { kind: 'daily', title: t, difficulty: df, stat: st, days: all }, start, rng);
  addOath(s, { kind: 'habit', title: 'Stood up and stretched', difficulty: 'trivial', stat: 'might', up: true, down: false }, start, rng);
  addOath(s, { kind: 'habit', title: 'Doomscrolling', difficulty: 'easy', stat: 'grit', up: false, down: true }, start, rng);
  for (let d = 45; d >= 1; d--) {
    const t0 = at(d, 7, 30);
    dayTurn(s, t0);
    if (d === 18) safe(() => addPause(s, today(s, t0), today(s, at(17, 8)), 'sick', today(s, t0)));
    if (!s.quest) { const b = BOSSES.find((x) => !s.defeated.includes(x.id) && (!x.needs || s.defeated.includes(x.needs))); if (b && s.defeated.length < 2) inviteBoss(s, b.id, t0); }
    if (d === 17 || d === 18) continue;
    const p = d > 30 ? 0.7 : 0.88;
    let t = t0;
    for (const o of s.oaths.filter((x) => isDueOn(x, today(s, t0)))) if (rng() < p) { t += 20 * 60000 + rng() * 3600000; safe(() => keepDaily(s, o.id, t, rng)); }
    if (rng() < 0.7) tapHabit(s, s.oaths.find((o) => o.title.startsWith('Stood'))!.id, 1, t + 60000, rng);
    if (d % 5 === 0) { const e = addOath(s, { kind: 'todo', title: ['Post the parcel', 'Book the dentist', 'Pay the water bill', 'Return library books'][d % 4], difficulty: 'medium', stat: 'craft' }, t, rng); completeTodo(s, e.id, t + 3600000, rng); }
    if (d % 6 === 0) { startFocus(s, 25, t + 7200000); finishFocus(s, t + 7200000 + 26 * 60000); }
    syncStory(s); while (canClaim(s)) claimChapter(s, t + 100000);
    if (d === 12) { s.hero.familiars.push('pip'); s.bonds.pip = 0; }
  }
  // now: today, a little done
  dayTurn(s, NOW);
  if (!s.quest) inviteBoss(s, 'drift', NOW);
  const due = s.oaths.filter((x) => isDueOn(x, today(s, NOW)));
  for (const o of due) o.doneDay = o.doneDay === today(s, NOW) ? null : o.doneDay; safe(() => keepDaily(s, due[0].id, NOW - 60000, rng)); safe(() => keepDaily(s, due[1].id, NOW - 50000, rng));
  const c = addChore(s, { name: 'The Garage', steps: ['Get three bin bags', 'Clear one shelf', 'Box up the old paint', 'Sweep the floor', 'Take bags to the tip', 'Hang the bikes'], difficulty: 'easy', stat: 'craft', art: 'weight' }, at(3, 10), rng);
  strikeChore(s, c.id, nextStep(c)!.id, at(3, 11), rng); strikeChore(s, c.id, nextStep(c)!.id, at(2, 11), rng);
  syncStory(s);
  s.dawn = null;
  s.reportSeen = '';
  return s;
}

function teegan(): Save {
  const s = newSave({ name: 'Teegan', calling: 'mystic', outfit: 'wayfarer', familiar: 'bramble', mode: 'gentle', look: { sex: 'female', skin: 'light', hair: 'ponytail', hairColor: 'chestnut' } }, at(9, 9), rng);
  for (let d = 9; d >= 0; d--) {
    const t = d === 0 ? NOW - 3 * 3600000 : at(d, 10);
    dayTurn(s, t);
    for (const o of s.oaths) if (rng() < 0.55) tapHabit(s, o.id, 1, t + rng() * 3600000 * (d === 0 ? 0.5 : 6), rng);
  }
  s.dawn = null;
  return s;
}

function kid(name: string, hair: string, color: string, fam: string, kept: number): Save {
  const s = newSave({ name, calling: 'warden', outfit: 'wayfarer', familiar: fam, mode: 'kid', look: { sex: 'female', skin: 'light', hair, hairColor: color } }, at(6, 8), rng);
  for (let d = 6; d >= 0; d--) {
    const t = d === 0 ? NOW - 2 * 3600000 : at(d, 8);
    dayTurn(s, t);
    s.oaths.slice(0, d === 0 ? kept : 4 + (d % 3)).forEach((o, i) => safe(() => keepDaily(s, o.id, t + i * 60000, rng)));
  }
  s.dawn = null;
  return s;
}

const heroes: [string, Save][] = [['main', christian()], ['teegan', teegan()], ['emma', kid('Emma', 'ponytail', 'blonde', 'pip', 3)], ['grace', kid('Grace', 'plain', 'chestnut', 'hazel', 2)], ['claire', kid('Claire', 'ponytail', 'black', 'inkling', 1)]];
const out: Record<string, string> = {};
for (const [id, s] of heroes) out[saveKey(id)] = JSON.stringify(s);
out[FAMILY_KEY] = JSON.stringify({ active: 'main', members: heroes.map(([id, s]) => ({ id, name: s.hero.name, mode: s.mode, level: s.hero.level })) });
out['hearthbound.prefs'] = JSON.stringify({ muted: true });
writeFileSync(process.argv[2] || '/tmp/hb-seed.json', JSON.stringify(out));
const c = heroes[0][1];
console.log('Christian level', c.hero.level, 'gold', c.hero.gold, 'defeated', c.defeated, 'quest', c.quest?.boss, 'story claimed', c.story.claimed, 'badges', Object.keys(c.achievements).length, 'season', c.season);
