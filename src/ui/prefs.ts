// Device preferences (shared by every hero on this phone): sound, music, badge.
export interface Prefs {
  muted: boolean; sfx: number; music: number; musicOn: boolean;
  badge: 'dailies' | 'streak' | 'off';
  lastBackupAt: number;
}
const KEY = 'hearthbound.prefs';
const DEF: Prefs = { muted: false, sfx: 0.8, music: 0.35, musicOn: true, badge: 'dailies', lastBackupAt: 0 };
let prefs: Prefs = read();
const subs = new Set<() => void>();
function read(): Prefs {
  try { const r = JSON.parse(localStorage.getItem(KEY) || '{}'); return { ...DEF, ...(r && typeof r === 'object' ? r : {}) }; } catch { return { ...DEF }; }
}
export const getPrefs = () => prefs;
export function setPrefs(p: Partial<Prefs>) {
  prefs = { ...prefs, ...p };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
export function onPrefs(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
