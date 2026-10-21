// Hearthbound service worker: precache the whole game, then serve it offline.
// Pages are network-first (so a new version shows up as soon as you are online),
// everything else is cache-first. Also: reminder notifications and their taps.
const CACHE = 'hearthbound-__VERSION__';
const META = 'hearthbound-meta';
const FILES = __FILES__;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('hearthbound-') && k !== CACHE && k !== META).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); } return res; })
        .catch(() => caches.match('./', { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => Response.error()))
  );
});

// ---- reminders
// The page writes a small snapshot (who wants a reminder, when, and how many dailies
// were left) into Cache Storage. Where the browser grants Periodic Background Sync
// (Chrome on Android, installed app) the worker checks it now and then and nudges.
async function readMeta() {
  try { const c = await caches.open(META); const r = await c.match('./meta.json'); return r ? await r.json() : null; } catch { return null; }
}
async function writeMeta(m) { const c = await caches.open(META); await c.put('./meta.json', new Response(JSON.stringify(m), { headers: { 'content-type': 'application/json' } })); }
function localDay(d, start) { const x = new Date(d); if (x.getHours() < start) x.setDate(x.getDate() - 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
async function nudge() {
  const m = await readMeta();
  if (!m || !Array.isArray(m.heroes)) return;
  const now = new Date();
  const hm = now.getHours() * 60 + now.getMinutes();
  let changed = false;
  for (const h of m.heroes) {
    if (!h.on || !h.time) continue;
    const [hh, mm] = h.time.split(':').map(Number);
    const day = localDay(now, h.dayStart || 4);
    if (hm < hh * 60 + mm || h.lastNudged === day) continue;
    // if the app has not been opened today, we do not know what was kept: nudge gently
    const left = h.day === day ? h.left : h.due;
    if (h.day === day && left <= 0) continue;
    await self.registration.showNotification('Hearthbound', {
      body: left > 0 ? `${h.name}: ${left} ${left === 1 ? 'daily is' : 'dailies are'} waiting by the fire.` : `${h.name}: the fire is waiting.`,
      tag: 'hb-daily-' + h.id, icon: './icons/icon-192.png', badge: './icons/badge-96.png', data: { url: './?action=next&hero=' + h.id },
    });
    h.lastNudged = day; changed = true;
  }
  if (changed) await writeMeta(m);
}
self.addEventListener('periodicsync', (e) => { if (e.tag === 'hb-reminder') e.waitUntil(nudge()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './?action=next', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    for (const c of cs) { if ('focus' in c) { c.postMessage({ type: 'open', url }); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
