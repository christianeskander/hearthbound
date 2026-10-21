import { useEffect, useState } from 'preact/hooks';
import { dayTurn } from '../engine/rules';
import { load, persist, migrate, newSave, type NewHero, type Store } from '../engine/save';
import { FAMILY_KEY, MAIN_ID, MAX_HEROES, backupKey, newMemberId, parseFamily, saveKey, type Family } from '../engine/family';
import { syncStory } from '../engine/story';
import { trimChores } from '../engine/chores';
import { addDays } from '../engine/time';
import { today } from '../engine/rules';
import type { DawnReport, Save } from '../engine/types';

type FX =
  | { type: 'keep'; gold: number; xp: number; strike: number; bright: boolean; combo: number; drop: string | null; levels: number; bossDown: string | null }
  | { type: 'hurt'; hp: number }
  | { type: 'level'; level: number }
  | { type: 'evolve'; familiar: string }
  | { type: 'pat' };

export const storage: Store = (() => {
  try { localStorage.setItem('hb.test', '1'); localStorage.removeItem('hb.test'); return localStorage; } catch {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  }
})();

let save: Save | null = null;
let family: Family = { active: MAIN_ID, members: [] };
let loadNote: string | null = null;
let undoSlot: { label: string; snap: string; at: number } | null = null;
/** The save as it was just before the last dawn ran, so "I was sick" can redo that night as a rest. */
let predawn: { snap: string; heroId: string } | null = null;
const subs = new Set<() => void>();
const fxSubs = new Set<(f: FX) => void>();
export interface Toast { id: number; text: string; kind?: 'good' | 'bad' | 'info'; undo?: boolean; action?: { label: string; run: () => void } }
let toasts: Toast[] = [];
let toastSeq = 0;

const key = () => saveKey(family.active);
function writeFamily() { storage.setItem(FAMILY_KEY, JSON.stringify(family)); }
function noteMember(s: Save) {
  const m = family.members.find((x) => x.id === family.active);
  if (m) { m.name = s.hero.name; m.mode = s.mode; m.level = s.hero.level; } else family.members.push({ id: family.active, name: s.hero.name, mode: s.mode, level: s.hero.level });
  writeFamily();
}
function write(s: Save) { persist(storage, s, key()); noteMember(s); }

/** Runs the dawn on a loaded save, keeping the night before for a possible "rest those nights". */
function dawn(s: Save, now: number): DawnReport | null {
  const before = JSON.stringify(s);
  const rep = dayTurn(s, now);
  if (rep && (rep.missed.length || rep.forgiven.length || rep.hpLost > 0 || rep.streaksBroken.length || rep.bossHits > 0)) predawn = { snap: before, heroId: family.active };
  else if (rep) predawn = null;
  return rep;
}

function open(id: string, now: number) {
  family.active = id;
  const r = load(storage, now, saveKey(id));
  save = r.save;
  if (r.from === 'backup') loadNote = 'The last save could not be read, so the backup copy was opened.';
  if (save) { dawn(save, now); syncStory(save); write(save); }
  undoSlot = null;
}

export function init(now = Date.now()) {
  family = parseFamily(storage.getItem(FAMILY_KEY), storage.getItem(saveKey(MAIN_ID)) !== null || storage.getItem(backupKey(MAIN_ID)) !== null);
  open(family.active, now);
  return save;
}
export const getSave = () => save;
export const getFamily = () => family;
export const takeLoadNote = () => { const n = loadNote; loadNote = null; return n; };

function emit() { subs.forEach((f) => f()); }
export function fx(f: FX) { fxSubs.forEach((g) => g(f)); }
export function onFx(f: (x: FX) => void) { fxSubs.add(f); return () => fxSubs.delete(f); }
export function onChange(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }

export function useSave(): Save | null {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return save;
}
export function useToasts(): Toast[] {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return toasts;
}

export function toast(text: string, kind: Toast['kind'] = 'info', undo = false, ms = 4200, action?: Toast['action']) {
  const t = { id: ++toastSeq, text, kind, undo, action };
  toasts = [...toasts.filter((x) => !x.undo || !undo), t].slice(-3);
  emit();
  if (ms > 0) setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); emit(); }, ms);
}
export function clearToasts() { if (toasts.length) { toasts = toasts.filter((t) => t.action); emit(); } }
export function dropToast(id: number) { toasts = toasts.filter((x) => x.id !== id); emit(); }

/**
 * Run a change against the save. The day turn always runs first, the result
 * is written to storage (with the previous copy kept as backup), and
 * undoable actions keep a snapshot for one tap of Undo.
 */
export function act<T>(label: string, fn: (s: Save, now: number) => T, opts: { undo?: boolean; keepDawn?: boolean } = {}): T | false {
  if (!save) return false;
  const now = Date.now();
  const before = JSON.stringify(save);
  const draft: Save = JSON.parse(before);
  dawn(draft, now);
  try {
    const out = fn(draft, now);
    syncStory(draft);
    trimChores(draft, now);
    save = draft;
    if (opts.undo) undoSlot = { label, snap: before, at: now };
    if (!opts.keepDawn) predawn = null;
    write(save);
    emit();
    return out;
  } catch (e) {
    toast((e as Error).message, 'bad');
    return false;
  }
}

export function undo() {
  if (!undoSlot || !save) return;
  save = migrate(JSON.parse(undoSlot.snap));
  toast(`Undid: ${undoSlot.label}`, 'info');
  undoSlot = null;
  toasts = toasts.filter((t) => !t.undo);
  write(save);
  emit();
}

export const canRestLastNight = () => !!predawn && predawn.heroId === family.active && !!save?.dawn;
/**
 * "I was sick / away": replays the last dawn with the missed days marked as rest
 * days, so no vitality, streak or boss bite is lost for them. Only offered right
 * after the dawn, before anything else is done.
 */
export function restLastNight(why: 'sick' | 'away' = 'sick') {
  if (!canRestLastNight() || !save) return false;
  const now = Date.now();
  const s = migrate(JSON.parse(predawn!.snap), now);
  const from = s.day.key, to = addDays(today(s, now), -1);
  if (to < from) return false;
  s.pauses = s.pauses.filter((p) => p.to < addDays(from, -1) || p.from > addDays(to, 1));
  s.pauses.push({ from, to, why });
  s.pauses.sort((a, b) => (a.from < b.from ? -1 : 1));
  s.stats.restDays += Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
  dayTurn(s, now);
  syncStory(s);
  predawn = null;
  save = s;
  write(s);
  emit();
  return true;
}

export function replaceSave(s: Save | null) {
  if (save) storage.setItem(backupKey(family.active), JSON.stringify(save));
  save = s;
  undoSlot = null; predawn = null;
  if (s) write(s); else { storage.removeItem(key()); }
  emit();
}

export function tick() {
  if (!save) return;
  const now = Date.now();
  const draft: Save = JSON.parse(JSON.stringify(save));
  if (dawn(draft, now)) { syncStory(draft); save = draft; write(save); }
  emit();
}

// ------------------------------------------------------------ family
export function switchHero(id: string) {
  if (!family.members.some((m) => m.id === id) || id === family.active) return;
  open(id, Date.now());
  writeFamily();
  toasts = [];
  emit();
}
/** Starts a new hero on this device and switches to them. */
export function addHero(n: NewHero) {
  if (family.members.length >= MAX_HEROES) throw new Error(`Up to ${MAX_HEROES} heroes on one device.`);
  const id = newMemberId(family);
  const now = Date.now();
  const s = newSave(n, now);
  family.active = id;
  save = s; undoSlot = null; predawn = null;
  write(s);
  emit();
  return id;
}
/** Pending: the Create screen is showing for a new family member. */
let adding = false;
export const isAdding = () => adding;
export function setAdding(v: boolean) { adding = v; emit(); }

export function removeHero(id: string) {
  if (family.members.length <= 1) throw new Error('Keep at least one hero.');
  const k = saveKey(id);
  const raw = storage.getItem(k);
  if (raw) storage.setItem(k + '.removed', raw); // one safety copy, in case of a mistap
  storage.removeItem(k);
  family.members = family.members.filter((m) => m.id !== id);
  if (family.active === id) open(family.members[0].id, Date.now());
  writeFamily();
  emit();
}

/** Every hero's save (for a family backup file). */
export function allHeroes(): { id: string; name: string; mode: Save['mode']; save: Save }[] {
  const out = [];
  for (const m of family.members) {
    const s = m.id === family.active ? save : load(storage, Date.now(), saveKey(m.id)).save;
    if (s) out.push({ id: m.id, name: s.hero.name, mode: s.mode, save: s });
  }
  return out;
}
/** Restores a family backup: every hero in the file replaces the one with the same id. */
export function restoreFamily(heroes: { id: string; save: Save }[]) {
  for (const h of heroes) {
    const k = saveKey(h.id);
    const prev = storage.getItem(k);
    if (prev) storage.setItem(k + '.backup', prev);
    storage.setItem(k, JSON.stringify(h.save));
    const m = family.members.find((x) => x.id === h.id);
    const info = { id: h.id, name: h.save.hero.name, mode: h.save.mode, level: h.save.hero.level };
    if (m) Object.assign(m, info); else family.members.push(info);
  }
  writeFamily();
  open(family.members.some((m) => m.id === family.active) ? family.active : heroes[0].id, Date.now());
  emit();
}

// ------------------------------------------------------------ app-level sheets and tabs
export type SheetName = 'family' | 'rest' | 'week' | null;
let sheet: SheetName = null;
let wantTab: string | null = null;
export function openSheet(n: SheetName) { sheet = n; emit(); }
export const getSheet = () => sheet;
export function goTab(t: string) { wantTab = t; emit(); }
export const takeTab = () => { const t = wantTab; wantTab = null; return t; };
