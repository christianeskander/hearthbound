// The app-icon badge: the number of dailies still to keep today (or the streak).
// Supported: installed web apps on iPhone/iPad (iOS 16.4+, only once notifications are
// allowed), Chrome/Edge desktop installs. Not supported on Android Chrome.
import { isDueOn, today } from '../engine/rules';
import type { Save } from '../engine/types';
import { getPrefs } from './prefs';
import { getSave } from './store';

export const badgeSupported = () => typeof navigator !== 'undefined' && 'setAppBadge' in navigator;
export function remaining(s: Save, now = Date.now()) {
  const d = today(s, now);
  return s.oaths.filter((o) => isDueOn(o, d) && o.doneDay !== d).length;
}
export const dueToday = (s: Save, now = Date.now()) => { const d = today(s, now); return s.oaths.filter((o) => isDueOn(o, d)).length; };
export const bestStreak = (s: Save) => Math.max(0, ...s.oaths.filter((o) => o.kind === 'daily').map((o) => o.streak));

export function refreshBadge() {
  const s = getSave();
  const nav = navigator as any;
  if (!badgeSupported()) return;
  const mode = getPrefs().badge;
  const n = !s || mode === 'off' ? 0 : mode === 'streak' ? bestStreak(s) : remaining(s);
  try { (n > 0 ? nav.setAppBadge(n) : nav.clearAppBadge()).catch(() => {}); } catch { /* not allowed */ }
}
