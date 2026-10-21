// Daily reminders, as honestly as the web allows:
// 1. While the app (or its service worker) is alive, a timer shows a notification at your time.
// 2. Where Notification Triggers exist (behind a flag in a few Chromium builds), the next
//    week of reminders is handed to the OS so they fire even when closed.
// 3. Chrome on Android (installed): Periodic Background Sync lets the worker check now and
//    then; timing is up to the browser (roughly daily, more if you use the app a lot).
// 4. Everywhere: a calendar file (.ics) with a daily repeating alarm that opens the app.
//    This is the one that works on iPhone with the app closed.
import { buildIcs } from '../engine/ics';
import type { Save } from '../engine/types';
import { allHeroes, getFamily, getSave } from './store';
import { dueToday, remaining } from './badge';
import { today } from '../engine/rules';

export const APP_URL = 'https://christianeskander.github.io/hearthbound/';
export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
export const permission = (): NotificationPermission | 'unsupported' => (notifySupported() ? Notification.permission : 'unsupported');
export const triggersSupported = () => typeof window !== 'undefined' && 'showTrigger' in (window as any).Notification?.prototype && 'TimestampTrigger' in window;
export const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function askPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported';
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

function nextAt(time: string, from = Date.now()) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(from); d.setHours(h, m, 0, 0);
  if (d.getTime() <= from) d.setDate(d.getDate() + 1);
  return d.getTime();
}

let timer: number | null = null;
async function show(s: Save, left: number) {
  const reg = await navigator.serviceWorker?.getRegistration();
  const body = left > 0 ? `${left} ${left === 1 ? 'daily is' : 'dailies are'} waiting by the fire.` : 'The fire is waiting.';
  const opts: NotificationOptions & Record<string, unknown> = { body, tag: 'hb-daily-' + getFamily().active, icon: './icons/icon-192.png', badge: './icons/badge-96.png', data: { url: './?action=next' } };
  if (reg) await reg.showNotification(`Hearthbound · ${s.hero.name}`, opts);
  else new Notification(`Hearthbound · ${s.hero.name}`, opts);
}
export async function testReminder() { const s = getSave(); if (s) await show(s, remaining(s)); }

/** Re-plans reminders for the active hero; call after any change and on start. */
export async function planReminders() {
  if (timer !== null) { clearTimeout(timer); timer = null; }
  writeMeta().catch(() => {});
  const s = getSave();
  if (!s || !s.settings.reminder.on || permission() !== 'granted') return;
  const at = nextAt(s.settings.reminder.time);
  if (at - Date.now() < 2 ** 31 - 1) timer = window.setTimeout(() => { const x = getSave(); if (x && x.settings.reminder.on && remaining(x) > 0) show(x, remaining(x)).catch(() => {}); planReminders(); }, at - Date.now());
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined);
  if (!reg) return;
  if (triggersSupported()) {
    try {
      const old = await reg.getNotifications({ includeTriggered: true } as any);
      old.filter((n) => n.tag.startsWith('hb-plan-')).forEach((n) => n.close());
      for (let i = 0; i < 7; i++) {
        const t = at + i * 86400000;
        await reg.showNotification(`Hearthbound · ${s.hero.name}`, { body: 'Your dailies are waiting by the fire.', tag: 'hb-plan-' + i, icon: './icons/icon-192.png', data: { url: './?action=next' }, showTrigger: new (window as any).TimestampTrigger(t) } as any);
      }
    } catch { /* not really supported */ }
  }
  const ps = (reg as any).periodicSync;
  if (ps) {
    try {
      const st = await (navigator as any).permissions?.query({ name: 'periodic-background-sync' });
      if (!st || st.state === 'granted') await ps.register('hb-reminder', { minInterval: 6 * 3600 * 1000 });
    } catch { /* browser said no; the in-app timer and calendar file still work */ }
  }
}
export const periodicSyncSupported = async () => { const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined); return !!(reg && (reg as any).periodicSync); };

/** A snapshot for the service worker (no secrets: names, times, counts). */
async function writeMeta() {
  if (!('caches' in window)) return;
  const heroes = allHeroes().map(({ id, save }) => ({
    id, name: save.hero.name, on: save.settings.reminder.on, time: save.settings.reminder.time, dayStart: save.settings.dayStart,
    day: today(save, Date.now()), left: remaining(save), due: dueToday(save),
  }));
  const c = await caches.open('hearthbound-meta');
  const prev = await c.match('./meta.json').then((r) => r?.json()).catch(() => null);
  const nudged = new Map<string, string>((prev?.heroes || []).map((h: any) => [h.id, h.lastNudged]));
  await c.put('./meta.json', new Response(JSON.stringify({ heroes: heroes.map((h) => ({ ...h, lastNudged: nudged.get(h.id) })) }), { headers: { 'content-type': 'application/json' } }));
}

export function icsFor(s: Save) {
  return buildIcs({ time: s.settings.reminder.time, url: APP_URL + '?action=next', name: s.hero.name, start: new Date(), uid: `daily-${getFamily().active}-${s.createdAt}@hearthbound` });
}
export function icsFile(s: Save) {
  return new File([icsFor(s)], `hearthbound-reminder-${s.hero.name.replace(/\W+/g, '-').toLowerCase()}.ics`, { type: 'text/calendar' });
}
/** A Google Calendar link with the same daily event (handy on Android). */
export function googleCalLink(s: Save) {
  const [h, m] = s.settings.reminder.time.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  const p = (n: number) => String(n).padStart(2, '0');
  const f = (x: Date) => `${x.getFullYear()}${p(x.getMonth() + 1)}${p(x.getDate())}T${p(x.getHours())}${p(x.getMinutes())}00`;
  const e = new Date(d.getTime() + 10 * 60000);
  const q = new URLSearchParams({ action: 'TEMPLATE', text: `Hearthbound: ${s.hero.name}'s dailies`, dates: `${f(d)}/${f(e)}`, recur: 'RRULE:FREQ=DAILY', details: `Your dailies are waiting by the fire.\n${APP_URL}?action=next`, ctz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}
