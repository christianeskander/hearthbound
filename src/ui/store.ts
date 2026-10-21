import { useEffect, useState } from 'preact/hooks';
import { dayTurn } from '../engine/rules';
import { load, persist, migrate, type Store } from '../engine/save';
import type { Save } from '../engine/types';

type FX =
  | { type: 'keep'; gold: number; xp: number; strike: number; bright: boolean; combo: number; drop: string | null; levels: number; bossDown: string | null }
  | { type: 'hurt'; hp: number }
  | { type: 'level'; level: number };

const storage: Store = (() => {
  try { localStorage.setItem('hb.test', '1'); localStorage.removeItem('hb.test'); return localStorage; } catch {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  }
})();

let save: Save | null = null;
let loadNote: string | null = null;
let undoSlot: { label: string; snap: string; at: number } | null = null;
const subs = new Set<() => void>();
const fxSubs = new Set<(f: FX) => void>();
export interface Toast { id: number; text: string; kind?: 'good' | 'bad' | 'info'; undo?: boolean }
let toasts: Toast[] = [];
let toastSeq = 0;

export function init(now = Date.now()) {
  const r = load(storage, now);
  save = r.save;
  if (r.from === 'backup') loadNote = 'Your last save could not be read, so the backup copy was opened.';
  if (save) { dayTurn(save, now); persist(storage, save); }
  return save;
}
export const getSave = () => save;
export const takeLoadNote = () => { const n = loadNote; loadNote = null; return n; };

function emit() { subs.forEach((f) => f()); }
export function fx(f: FX) { fxSubs.forEach((g) => g(f)); }
export function onFx(f: (x: FX) => void) { fxSubs.add(f); return () => fxSubs.delete(f); }

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

export function toast(text: string, kind: Toast['kind'] = 'info', undo = false, ms = 4200) {
  const t = { id: ++toastSeq, text, kind, undo };
  toasts = [...toasts.filter((x) => !x.undo || !undo), t].slice(-3);
  emit();
  setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); emit(); }, ms);
}
export function clearToasts() { if (toasts.length) { toasts = []; emit(); } }
export function dropToast(id: number) { toasts = toasts.filter((x) => x.id !== id); emit(); }

/**
 * Run a change against the save. The day turn always runs first, the result
 * is written to storage (with the previous copy kept as backup), and
 * undoable actions keep a snapshot for one tap of Undo.
 */
export function act<T>(label: string, fn: (s: Save, now: number) => T, opts: { undo?: boolean } = {}): T | false {
  if (!save) return false;
  const now = Date.now();
  const before = JSON.stringify(save);
  const draft: Save = JSON.parse(before);
  dayTurn(draft, now);
  try {
    const out = fn(draft, now);
    save = draft;
    if (opts.undo) undoSlot = { label, snap: before, at: now };
    persist(storage, save);
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
  persist(storage, save);
  emit();
}

export function replaceSave(s: Save | null) {
  if (save) storage.setItem('hearthbound.save.backup', JSON.stringify(save));
  save = s;
  undoSlot = null;
  if (s) persist(storage, s); else storage.removeItem('hearthbound.save');
  emit();
}

export function tick() {
  if (!save) return;
  const now = Date.now();
  const draft: Save = JSON.parse(JSON.stringify(save));
  if (dayTurn(draft, now)) { save = draft; persist(storage, save); }
  emit();
}
