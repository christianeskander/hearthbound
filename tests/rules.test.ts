import { describe, expect, it } from 'vitest';
import { hearthDay, addDays, daysBetween, weekOf } from '../src/engine/time';
import {
  addOath, buyFamiliar, buyGear, buyReward, canLearn, completeTodo, dayTurn, finishFocus, forge, inviteBoss, keepDaily, learnPerk,
  maxHp, mods, nextOath, preview, rest, startFocus, tapHabit, xpToNext, kindle, validateOath, focusLeft, streakBonus,
} from '../src/engine/rules';
import { newSave, migrate, persist, load, exportSave, importSave, KEY, BACKUP_KEY, type Store } from '../src/engine/save';
import { suggest, accept, dismiss } from '../src/engine/mind';
import type { Save } from '../src/engine/types';

const T = (y: number, m: number, d: number, h = 9, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const never = () => 0.999; // no bright keeps, no drops
const always = () => 0; // bright keep + drop every time

function fresh(now = T(2026, 10, 21, 9), calling = 'warden'): Save {
  const s = newSave({ name: 'Christian', calling, outfit: 'wayfarer', familiar: 'soot', look: { sex: 'male', skin: 'light', hair: 'plain', hairColor: 'black' } }, now, never);
  s.oaths = []; // start every test from an empty oath list
  s.dawn = null;
  return s;
}
const daily = (s: Save, now: number, extra: Partial<Parameters<typeof addOath>[1]> = {}) =>
  addOath(s, { kind: 'daily', title: 'Water', difficulty: 'easy', stat: 'grit', days: [0, 1, 2, 3, 4, 5, 6], ...extra }, now, never);

describe('hearth day', () => {
  it('turns at 4am local, not midnight', () => {
    expect(hearthDay(T(2026, 10, 21, 3, 59))).toBe('2026-10-20');
    expect(hearthDay(T(2026, 10, 21, 4, 0))).toBe('2026-10-21');
    expect(hearthDay(T(2026, 10, 21, 0, 30), 0)).toBe('2026-10-21');
  });
  it('steps across month ends and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-10-04', 1)).toBe('2026-10-05'); // Sydney DST starts Oct 4 2026
    expect(daysBetween('2026-10-03', '2026-10-06')).toEqual(['2026-10-03', '2026-10-04', '2026-10-05']);
    expect(weekOf('2026-10-21')).toBe('2026-10-19');
  });
});

describe('keeping dailies', () => {
  it('pays xp, gold, mana and builds a streak', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const o = daily(s, now);
    const r = keepDaily(s, o.id, now, never);
    expect(r.payout.gold).toBeGreaterThanOrEqual(2);
    expect(s.hero.gold).toBe(r.payout.gold);
    expect(s.hero.xp).toBe(r.payout.xp);
    expect(o.streak).toBe(1);
    expect(s.chronicle[0].text).toContain('Kept "Water"');
  });
  it('cannot be kept twice in one hearth day, even after midnight', () => {
    const s = fresh(T(2026, 10, 21, 9));
    const o = daily(s, T(2026, 10, 21, 9));
    keepDaily(s, o.id, T(2026, 10, 21, 22), never);
    expect(() => keepDaily(s, o.id, T(2026, 10, 22, 1), never)).toThrow(/Already kept/);
  });
  it('refuses a day it is not due', () => {
    const s = fresh(T(2026, 10, 21, 9)); // a Wednesday
    const o = daily(s, T(2026, 10, 21, 9), { days: [1] }); // Mondays only
    expect(() => keepDaily(s, o.id, T(2026, 10, 21, 9), never)).toThrow(/Not due/);
    expect(nextOath(s, T(2026, 10, 21, 9))).toBeNull();
  });
  it('preview matches what an unlucky keep pays', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const o = daily(s, now, { difficulty: 'hard' });
    const p = preview(s, o, now);
    const r = keepDaily(s, o.id, now, never);
    expect(r.payout.gold).toBe(p.gold);
    expect(r.payout.xp).toBe(p.xp);
  });
  it('a bright keep pays half again and can drop a material', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now); const o = daily(s, now, { difficulty: 'hard' });
    const p = preview(s, o, now);
    const r = keepDaily(s, o.id, now, always);
    expect(r.payout.bright).toBe(true);
    expect(r.payout.gold).toBe(Math.round(p.gold * 1.5));
    expect(r.payout.drop).toBe('ember');
    expect(s.materials.ember).toBe(1);
  });
  it('rejects bad oaths', () => {
    expect(validateOath({ kind: 'daily', title: ' ', difficulty: 'easy', stat: 'wit', days: [1] })).toMatch(/name/);
    expect(validateOath({ kind: 'daily', title: 'x', difficulty: 'easy', stat: 'wit', days: [] })).toMatch(/day/);
    expect(validateOath({ kind: 'habit', title: 'x', difficulty: 'easy', stat: 'wit' })).toMatch(/side/);
  });
});

describe('combo', () => {
  it('builds for keeps close together and resets after a gap', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const a = daily(s, now, { title: 'a' }), b = daily(s, now, { title: 'b' }), c = daily(s, now, { title: 'c' }), d = daily(s, now, { title: 'd' });
    expect(keepDaily(s, a.id, now, never).payout.combo).toBe(1);
    expect(keepDaily(s, b.id, now + 5 * 60000, never).payout.combo).toBe(2);
    const third = keepDaily(s, c.id, now + 10 * 60000, never);
    expect(third.payout.combo).toBe(3);
    expect(keepDaily(s, d.id, now + 3 * 3600000, never).payout.combo).toBe(1);
  });
  it('makes a combo keep pay more than a lone one', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const a = daily(s, now, { title: 'a', difficulty: 'hard' }), b = daily(s, now, { title: 'b', difficulty: 'hard' });
    const lone = preview(s, b, now).xp;
    keepDaily(s, a.id, now, never);
    expect(preview(s, b, now + 60000).xp).toBeGreaterThan(lone);
  });
});

describe('the day turn', () => {
  it('a missed daily costs vitality and breaks the streak; the dawn report says so', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = fresh(d1); s.hero.embers = 0;
    const o = daily(s, d1, { difficulty: 'medium' });
    keepDaily(s, o.id, d1, never); // streak 1 on the 21st
    const hp0 = s.hero.hp;
    dayTurn(s, T(2026, 10, 22, 9)); // 21st was kept
    expect(s.hero.hp).toBe(Math.min(maxHp(s), hp0 + 4)); // the hearth's 2 plus Soot's 2
    const rep = dayTurn(s, T(2026, 10, 23, 9))!; // 22nd missed
    expect(rep.missed).toHaveLength(1);
    expect(rep.streaksBroken[0]).toEqual({ title: 'Water', was: 1 });
    expect(o.streak).toBe(0);
    expect(rep.hpLost).toBeGreaterThan(0);
    expect(s.dawn).toBe(rep);
  });
  it('runs only once per hearth day', () => {
    const s = fresh(T(2026, 10, 21, 9));
    daily(s, T(2026, 10, 21, 9));
    expect(dayTurn(s, T(2026, 10, 22, 5))).not.toBeNull();
    expect(dayTurn(s, T(2026, 10, 22, 23))).toBeNull();
    expect(dayTurn(s, T(2026, 10, 23, 2))).toBeNull(); // still the 22nd's hearth day
  });
  it('an ember token forgives one miss and keeps the streak', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = fresh(d1);
    expect(s.hero.embers).toBe(1);
    const a = daily(s, d1, { title: 'a' }), b = daily(s, d1, { title: 'b' });
    a.streak = 4; b.streak = 4;
    const rep = dayTurn(s, T(2026, 10, 22, 9))!;
    expect(rep.forgiven).toEqual([{ title: 'a', by: 'ember' }]);
    expect(rep.missed.map((m) => m.title)).toEqual(['b']);
    expect(a.streak).toBe(4); expect(b.streak).toBe(0);
    expect(s.hero.embers).toBe(0);
  });
  it('a long absence only costs three nights of vitality', () => {
    const d1 = T(2026, 10, 1, 9);
    const s = fresh(d1, 'scholar'); s.hero.embers = 0; s.hero.hp = 1000; // no fall in this test
    daily(s, d1, { difficulty: 'easy' });
    const rep = dayTurn(s, T(2026, 10, 21, 9))!;
    expect(rep.nights).toBe(20);
    expect(rep.missed).toHaveLength(20);
    expect(rep.missed.filter((m) => m.hp > 0)).toHaveLength(3);
  });
  it('a new daily is not missed on days before it existed', () => {
    const s = fresh(T(2026, 10, 18, 9)); s.hero.embers = 0;
    s.lastDay = '2026-10-18';
    daily(s, T(2026, 10, 21, 9));
    const rep = dayTurn(s, T(2026, 10, 22, 9))!;
    expect(rep.missed).toHaveLength(1); // only the 21st
  });
  it('falling resets you kindly: full vitality, 10% gold and half the level progress lost', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = fresh(d1); s.hero.embers = 0; s.hero.hp = 3; s.hero.gold = 100; s.hero.xp = 20;
    daily(s, d1, { difficulty: 'hard' });
    const rep = dayTurn(s, T(2026, 10, 22, 9))!;
    expect(rep.fell).toBe(true);
    expect(s.hero.hp).toBe(maxHp(s));
    expect(s.hero.gold).toBe(90);
    expect(rep.goldLost).toBe(10);
    expect(s.hero.xp).toBe(10);
    expect(s.hero.level).toBe(1);
  });
  it('Warden misses hurt less than Scholar misses', () => {
    const hurt = (calling: string) => {
      const s = fresh(T(2026, 10, 21, 9), calling); s.hero.embers = 0;
      daily(s, T(2026, 10, 21, 9), { difficulty: 'hard' });
      return dayTurn(s, T(2026, 10, 22, 9))!.hpLost;
    };
    expect(hurt('warden')).toBeLessThan(hurt('scholar'));
  });
});

describe('bosses', () => {
  it('keeps wound the Slime of Later; misses let it hit back; defeat pays out', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = fresh(d1, 'vanguard'); s.hero.embers = 0;
    const o = daily(s, d1, { difficulty: 'hard' });
    inviteBoss(s, 'slime', d1);
    expect(s.settings.location).toBe('wood');
    const r = keepDaily(s, o.id, d1, never);
    expect(r.payout.strike).toBeGreaterThan(0);
    expect(s.quest!.hp).toBe(130 - r.payout.strike);
    dayTurn(s, T(2026, 10, 22, 9));
    const rep = dayTurn(s, T(2026, 10, 23, 9))!;
    expect(rep.bossHits).toBe(1);
    s.quest!.hp = 1;
    const gold = s.hero.gold;
    const k = keepDaily(s, o.id, T(2026, 10, 23, 10), never);
    expect(k.bossDown).toBe('slime');
    expect(s.quest).toBeNull();
    expect(s.hero.gold).toBe(gold + k.payout.gold + 80);
    expect(s.hero.titles).toContain('Breaker of Later');
    expect(s.materials.gel).toBe(3);
  });
  it('the Gnawing Doubt waits until the slime is beaten', () => {
    const s = fresh();
    expect(() => inviteBoss(s, 'rat', T(2026, 10, 21))).toThrow(/Slime of Later/);
    s.defeated.push('slime');
    inviteBoss(s, 'rat', T(2026, 10, 21));
    expect(s.quest!.boss).toBe('rat');
  });
});

describe('levels, perks, habits, errands', () => {
  it('levels up with a skill point and a full refill', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now); s.hero.hp = 10; s.hero.xp = xpToNext(1) - 1;
    const o = daily(s, now);
    const r = keepDaily(s, o.id, now, never);
    expect(r.levelsGained).toBe(1);
    expect(s.hero.level).toBe(2);
    expect(s.hero.skillPoints).toBe(1);
    expect(s.hero.hp).toBe(maxHp(s));
  });
  it('perks need points and their earlier tier, and change the maths', () => {
    const s = fresh();
    expect(canLearn(s, 'soft_landing')).toMatch(/No skill points/);
    s.hero.skillPoints = 2;
    expect(canLearn(s, 'banked_coals')).toMatch(/Soft Landing first/);
    const before = mods(s).missCut;
    learnPerk(s, 'soft_landing', T(2026, 10, 21));
    expect(mods(s).missCut).toBeCloseTo(before + 0.25);
    expect(s.hero.skillPoints).toBe(1);
  });
  it('habits pay on + and cost vitality on −', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const h = addOath(s, { kind: 'habit', title: 'h', difficulty: 'medium', stat: 'wit', up: true, down: true }, now, never);
    const hp = s.hero.hp;
    tapHabit(s, h.id, 1, now, never);
    expect(s.hero.gold).toBeGreaterThan(0);
    const r = tapHabit(s, h.id, -1, now, never) as { hurt: number };
    expect(s.hero.hp).toBe(hp - r.hurt);
    expect(h.ups).toBe(1); expect(h.downs).toBe(1);
  });
  it('errands complete once', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const t = addOath(s, { kind: 'todo', title: 'post', difficulty: 'easy', stat: 'craft' }, now, never);
    completeTodo(s, t.id, now, never);
    expect(() => completeTodo(s, t.id, now, never)).toThrow();
  });
  it('rest works once a day and costs mana', () => {
    const s = fresh(); s.hero.hp = 20; s.hero.mana = 25;
    rest(s, T(2026, 10, 21));
    expect(s.hero.hp).toBe(35); expect(s.hero.mana).toBe(15);
    expect(() => rest(s, T(2026, 10, 21))).toThrow(/already rested/);
  });
  it('kindling turns mana into an ember token, up to 3', () => {
    const s = fresh(); s.hero.mana = 200; s.hero.level = 50;
    kindle(s, 0); kindle(s, 0);
    expect(s.hero.embers).toBe(3);
    expect(() => kindle(s, 0)).toThrow(/hold 3/);
  });
});

describe('market, forge and focus', () => {
  it('buying gear equips it and spends gold; you cannot overspend', () => {
    const s = fresh(); s.hero.gold = 95;
    expect(() => buyGear(s, 'kettle', 0)).toThrow(/more gold/);
    buyGear(s, 'cape_red', 0);
    expect(s.hero.gold).toBe(5);
    expect(s.hero.equipped.cloak).toBe('cape_red');
    expect(mods(s).gold).toBeGreaterThan(mods(fresh()).gold);
  });
  it('familiars can be bought and walk with you', () => {
    const s = fresh(); s.hero.gold = 90;
    buyFamiliar(s, 'bramble', 0);
    expect(s.hero.familiar).toBe('bramble');
    expect(s.hero.gold).toBe(0);
  });
  it('real-life rewards cost gold', () => {
    const s = newSave({ name: 'A', calling: 'warden', outfit: 'scout', familiar: 'soot', look: { sex: 'female', skin: 'light', hair: 'bob', hairColor: 'black' } }, T(2026, 10, 21), never);
    const coffee = s.rewards[0];
    expect(() => buyReward(s, coffee.id, 0)).toThrow(/more gold/);
    s.hero.gold = 30; buyReward(s, coffee.id, 0);
    expect(s.hero.gold).toBe(5); expect(coffee.bought).toBe(1);
  });
  it('the forge uses materials (Tinker needs one less)', () => {
    const s = fresh(T(2026, 10, 21), 'tinker'); s.hero.embers = 0;
    s.materials.ember = 2;
    forge(s, 'r_ember', 0);
    expect(s.hero.embers).toBe(1); expect(s.materials.ember).toBe(0);
  });
  it('a focus rite pays only after its time', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    startFocus(s, 25, now);
    expect(() => finishFocus(s, now + 10 * 60000)).toThrow(/still burning/);
    expect(focusLeft(s, now + 10 * 60000)).toBe(15 * 60000);
    const p = finishFocus(s, now + 25 * 60000);
    expect(p.xp).toBeGreaterThan(0);
    expect(s.focus).toBeNull();
    expect(s.stats.focusMinutes).toBe(25);
  });
});

describe('Hearthmind', () => {
  it('notices a slipping daily and offers a smaller one; dismiss hides it', () => {
    const d0 = T(2026, 10, 10, 9);
    const s = fresh(d0); s.hero.embers = 0; s.hero.hp = 1000;
    const o = daily(s, d0, { difficulty: 'hard', title: 'Gym' });
    dayTurn(s, T(2026, 10, 21, 9));
    const now = T(2026, 10, 21, 10);
    const sug = suggest(s, now)!;
    expect(sug.kind).toBe('shrink');
    accept(s, sug, now);
    expect(o.difficulty).toBe('medium');
    expect(suggest(s, now)?.key).not.toBe(sug.key);
  });
  it('points out an untrained stat after enough keeps', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const ids = Array.from({ length: 8 }, (_, i) => daily(s, now, { title: 'w' + i, stat: 'might' }).id);
    ids.forEach((id, i) => keepDaily(s, id, now + i * 3600000, never));
    const sug = suggest(s, now + 9 * 3600000)!;
    expect(['untrained', 'hour']).toContain(sug.kind);
    const all: string[] = [];
    let cur = sug; let guard = 0;
    while (cur && guard++ < 10) { all.push(cur.kind); dismiss(s, cur, now); cur = suggest(s, now + 9 * 3600000)!; }
    expect(all).toContain('untrained');
  });
});

describe('save, load and migrate', () => {
  const mem = (): Store & { m: Map<string, string> } => {
    const m = new Map<string, string>();
    return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  };
  it('round-trips through storage and keeps a backup of the previous copy', () => {
    const st = mem();
    const s = fresh(); persist(st, s);
    s.hero.gold = 77; persist(st, s);
    expect(JSON.parse(st.m.get(BACKUP_KEY)!).hero.gold).toBe(0);
    expect(load(st).save!.hero.gold).toBe(77);
  });
  it('falls back to the backup when the live copy is corrupt', () => {
    const st = mem();
    const s = fresh(); s.hero.gold = 5; persist(st, s); persist(st, s);
    st.m.set(KEY, '{broken');
    const r = load(st);
    expect(r.from).toBe('backup');
    expect(r.save!.hero.gold).toBe(5);
  });
  it('export then import returns the same life, chronicle included', () => {
    const s = fresh(); s.hero.level = 4; s.chronicle.push({ t: 1, text: 'hello', kind: 'life' });
    s.focus = { startedAt: 123, minutes: 25 };
    const back = importSave(exportSave(s));
    expect(back.hero.name).toBe('Christian');
    expect(back.hero.level).toBe(4);
    expect(back.chronicle.map((c) => c.text)).toContain('hello');
    expect(back.focus).toEqual({ startedAt: 123, minutes: 25 });
  });
  it('refuses a file that is not a save', () => {
    expect(() => importSave('nope')).toThrow(/not readable/);
    expect(() => importSave('{"foo":1}')).toThrow(/not a Hearthbound save/);
  });
  it('migrates a v1 save with tasks and vitality', () => {
    const v1 = { version: 1, hero: { name: 'Old', calling: 'mystic', vitality: 30, gold: 12, body: 'man', equipped: { torso: 'bogus' } }, tasks: [{ id: 'x', type: 'daily', title: 'Read', difficulty: 'hard', streak: 3 }, { type: 'errand', title: 'Post' }, { title: '' }] };
    const s = migrate(v1);
    expect(s.version).toBe(3);
    expect(s.oaths[0].cold).toBe(0);
    expect(s.hero.hp).toBe(30);
    expect(s.hero.look.sex).toBe('male');
    expect(s.hero.equipped.torso).toBe('tunic_linen');
    expect(s.oaths.map((o) => o.kind)).toEqual(['daily', 'todo']);
    expect(s.oaths[0].streak).toBe(3);
    expect(s.hero.familiar).toBe('soot');
  });
});

describe('balance (v3)', () => {
  it('the level curve is quick early and slower later', () => {
    expect(xpToNext(1)).toBe(40);
    expect(xpToNext(2)).toBe(70);
    for (let l = 1; l < 40; l++) {
      expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
      expect(xpToNext(l + 2) - xpToNext(l + 1)).toBeGreaterThanOrEqual(xpToNext(l + 1) - xpToNext(l));
    }
    expect(xpToNext(10)).toBeGreaterThan(400);
  });
  it('streak bonus tops out at +30%', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(4)).toBeCloseTo(0.1);
    expect(streakBonus(12)).toBeCloseTo(0.3);
    expect(streakBonus(100)).toBeCloseTo(0.3);
  });
  it('a daily you missed pays a rekindle bonus when you pick it back up, then goes back to normal', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = fresh(d1, 'warden'); s.hero.embers = 0;
    const o = daily(s, d1, { difficulty: 'medium' });
    const normal = preview(s, o, d1).gold;
    dayTurn(s, T(2026, 10, 22, 9)); // missed the 21st
    dayTurn(s, T(2026, 10, 23, 9)); // and the 22nd
    expect(o.cold).toBe(2);
    expect(s.dawn!.gifts.join(' ')).toMatch(/Rekindle/);
    const now = T(2026, 10, 23, 10);
    const p = preview(s, o, now);
    expect(p.rekindle).toBeCloseTo(0.5);
    expect(p.gold).toBeGreaterThan(normal);
    keepDaily(s, o.id, now, never);
    expect(o.cold).toBe(0);
    expect(s.chronicle[0].text).toMatch(/^Rekindled/);
    for (let i = 0; i < 6; i++) dayTurn(s, T(2026, 10, 24 + i, 9));
    expect(o.cold).toBe(3); // capped
  });
  it('repeat + taps on one habit fade, never reach zero, and do not build the combo', () => {
    const now = T(2026, 10, 21, 9);
    const s = fresh(now);
    const h = addOath(s, { kind: 'habit', title: 'h', difficulty: 'medium', stat: 'wit', up: true, down: false }, now, never);
    const pays: number[] = [];
    for (let i = 0; i < 8; i++) pays.push((tapHabit(s, h.id, 1, now + i * 60000, never) as { payout: { xp: number } }).payout.xp);
    expect(pays[0]).toBe(14);
    expect(pays[1]).toBeLessThan(pays[0]);
    expect(pays[2]).toBeLessThan(pays[1]);
    expect(Math.min(...pays)).toBeGreaterThan(0);
    expect(pays.reduce((a, b) => a + b, 0)).toBeLessThan(14 * 3);
    expect(s.day.combo).toBe(0);
    dayTurn(s, T(2026, 10, 22, 9)); // a new day: full pay again
    expect(preview(s, h, T(2026, 10, 22, 10)).xp).toBe(14);
  });
  it('one dawn never takes more than 40% of max vitality, and says so', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = fresh(d1, 'scholar'); s.hero.embers = 0;
    for (let i = 0; i < 10; i++) daily(s, d1, { title: 'd' + i, difficulty: 'hard' });
    const max = maxHp(s);
    const rep = dayTurn(s, T(2026, 10, 22, 9))!;
    expect(rep.fell).toBe(false);
    expect(rep.spared).toBeGreaterThan(0);
    expect(max - s.hero.hp).toBeLessThanOrEqual(Math.round(max * 0.4));
    expect(rep.gifts.join(' ')).toMatch(/hearth caught you/);
  });
  it('the hearth mends a little at dawn for everyone, and a keep warms you by 1', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = newSave({ name: 'A', calling: 'scholar', outfit: 'wayfarer', familiar: 'pip', look: { sex: 'female', skin: 'light', hair: 'bob', hairColor: 'black' } }, d1, never);
    s.oaths = [];
    const o = daily(s, d1);
    s.hero.hp = 20;
    keepDaily(s, o.id, d1, never);
    expect(s.hero.hp).toBe(21);
    s.hero.familiar = 'pip';
    dayTurn(s, T(2026, 10, 22, 9));
    expect(s.hero.hp).toBe(23);
  });
  it('a boss bites for its power per miss, softened by miss reduction', () => {
    const d1 = T(2026, 10, 21, 9);
    const s = fresh(d1, 'scholar'); s.hero.embers = 0;
    s.defeated.push('slime');
    daily(s, d1, { title: 'a' }); daily(s, d1, { title: 'b' });
    inviteBoss(s, 'rat', d1);
    expect(dayTurn(s, T(2026, 10, 22, 9))!.bossHits).toBe(4);
  });
  it('old saves at a level the new curve has passed get their levels and skill points', () => {
    const s = fresh();
    s.hero.level = 2; s.hero.xp = 80; s.hero.skillPoints = 1; // 80 XP was not enough for L3 before (90), it is now (70)
    const m = migrate(JSON.parse(JSON.stringify(s)));
    expect(m.hero.level).toBe(3);
    expect(m.hero.xp).toBe(10);
    expect(m.hero.skillPoints).toBe(2);
  });
});
