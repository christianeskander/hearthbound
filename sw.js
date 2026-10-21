// Hearthbound service worker: precache the whole game, then serve it offline.
// Pages are network-first (so a new version shows up as soon as you are online),
// everything else is cache-first. Also: reminder notifications and their taps.
const CACHE = 'hearthbound-7e4ecbd6d5';
const META = 'hearthbound-meta';
const FILES = ["./","./assets/bg/coast/back.png","./assets/bg/coast/clouds.png","./assets/bg/coast/ground.png","./assets/bg/coast/sea.png","./assets/bg/inn/sky.png","./assets/bg/inn/street.png","./assets/bg/inn/town.png","./assets/bg/ridge/bg.png","./assets/bg/ridge/ground.png","./assets/bg/ridge/montain-far.png","./assets/bg/ridge/mountains.png","./assets/bg/ridge/trees.png","./assets/bg/road/back.png","./assets/bg/road/forest.png","./assets/bg/road/ground.png","./assets/bg/road/tree.png","./assets/bg/wood/back-trees.png","./assets/bg/wood/front-trees.png","./assets/bg/wood/lights.png","./assets/bg/wood/middle-trees.png","./assets/bosses/drift.png","./assets/bosses/gleam.png","./assets/bosses/maybe.png","./assets/bosses/rat.png","./assets/bosses/slime.png","./assets/bosses/weight.png","./assets/hall-DYT9fT9c.js","./assets/hero/belt_f.png","./assets/hero/belt_m.png","./assets/hero/body_female.png","./assets/hero/body_male.png","./assets/hero/boots_f.png","./assets/hero/boots_m.png","./assets/hero/cap.png","./assets/hero/cap_feather.png","./assets/hero/cape_bg.png","./assets/hero/cape_fg.png","./assets/hero/chain_f.png","./assets/hero/chain_m.png","./assets/hero/eyes.png","./assets/hero/greaves_f.png","./assets/hero/greaves_m.png","./assets/hero/hair_bangs.png","./assets/hero/hair_bob.png","./assets/hero/hair_buzz.png","./assets/hero/hair_long.png","./assets/hero/hair_messy.png","./assets/hero/hair_pixie.png","./assets/hero/hair_plain.png","./assets/hero/hair_ponytail.png","./assets/hero/hair_ponytail_bg.png","./assets/hero/head_female.png","./assets/hero/head_male.png","./assets/hero/hood.png","./assets/hero/kettle.png","./assets/hero/leather_f.png","./assets/hero/leather_m.png","./assets/hero/pants_f.png","./assets/hero/pants_m.png","./assets/hero/plate_f.png","./assets/hero/plate_m.png","./assets/hero/sabatons_f.png","./assets/hero/sabatons_m.png","./assets/hero/shirt_long_f.png","./assets/hero/shirt_long_m.png","./assets/hero/shirt_short_f.png","./assets/hero/shirt_short_m.png","./assets/hero/shoes_f.png","./assets/hero/shoes_m.png","./assets/hero/skirt_f.png","./assets/hero/skirt_m.png","./assets/index-BF3_Q2rN.css","./assets/index-DxfugaLf.js","./assets/pets/bramble.png","./assets/pets/hazel.png","./assets/pets/inkling.png","./assets/pets/pip.png","./assets/pets/soot.png","./icons/apple-touch-icon.png","./icons/badge-96.png","./icons/favicon-32.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-192.png","./icons/maskable-512.png","./icons/sc-focus.png","./icons/sc-next.png","./icons/sc-tiny.png","./icons/sc-week.png","./index.html","./manifest.webmanifest"];
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
