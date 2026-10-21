# Hearthbound

A small pixel-art RPG habit tracker for your phone. Keep your daily oaths, earn
gold and XP, dress your hero, and wear down the Slime of Later. Installable,
works offline, and everything stays on the device (no account, no network).

## Run it

```sh
npm install          # also trims Phaser to the one file the game uses (postinstall)
npm run dev          # local dev server
npm test             # unit tests (rules, save v3→v4 migration, story, familiars, season, badges, rest days, chores, report, .ics, family)
npm run sim          # balance simulator: 30/90/180 days for three player types (see BALANCE.md)
npm run build        # type-check + production build into dist/ (with an offline service worker)
npm run preview      # serve dist/ on :4173
npm run e2e          # phone-size browser run (390x844) with screenshots; needs `npm run preview`
                     #   uses system Chrome: CHROME=/path/to/chrome npm run e2e
```

Art is generated, not hand-copied: `npm run assets` re-downloads only the source
sheets listed in `CREDITS.md` (into `/tmp/hb-src`, outside the repo) and rewrites
`public/assets/` and the app icons. You only need Python 3 with Pillow for that.

## How it is put together

- `src/engine/` is plain TypeScript with no browser APIs: rules, content,
  the 4:00am day turn, save/backup/migrate, and the Hearthmind (rule-based,
  on-device suggestions). This is what the unit tests cover.
- `src/hall/` is the Phaser 3 scene for the hall: parallax location, hero,
  familiar, foes and keep effects. It is loaded lazily so the first screen is
  fast. Each scene pixel is exactly an integer number of device pixels and the
  ground scrolls 4px per walk frame (the planted foot's own step), so the walk
  does not slide.
- `src/art/` composes the hero at runtime from LPC layers: body, head, hair and
  every worn item, recoloured index-for-index. What you buy is what you see.
- `src/ui/` is Preact: creation, Hall, Oaths, Journey (story, season, badges,
  stats, weekly report), Market, Hero, plus the kid view and family switcher.

## What's new in v2 (save v4)

Sound and calm music (start after the first tap, mute is remembered), daily reminders
(see the limits below), a story questline, four new foes, familiar growth, family mode
(separate heroes on one phone, with gentle and kid modes), stats charts, a free
monthly season track, 33 badges, big tasks (chore bosses whose health is their steps),
file backup with sharing and restore, proper PWA icons and an app badge, a gentle
weekly report card, rest days for sickness or travel, home-screen shortcuts, and a
day/night look that follows the clock. Old saves move to v4 on first load with all
progress kept.

### Honest limits

- **Reminders.** A web app cannot wake itself up on a schedule. The reminder fires while
  the app is open or was used recently. Installed Chrome on Android can also check in
  the background now and then, and the browser decides when. On iPhone, notifications
  need iOS 16.4+ and the app added to the Home Screen, and they only fire while it is
  running. For a reminder that always fires, use "Add to calendar (.ics)" or the
  Google Calendar link.
- **App badge.** Shown on iPhone (16.4+, Home Screen app, after allowing notifications)
  and on desktop Chrome/Edge. Android Chrome does not support it, though notifications may show a dot.
- **Widget.** A real home-screen widget needs a native app. Instead there are long-press
  shortcuts on the app icon (Next oath, Focus, Tiny win, This week) plus the badge.
- **No cloud save.** Data lives on the phone. Use Back up / Share… to keep a copy.

Saves live in `localStorage` (`hearthbound.save`, extra heroes in
`hearthbound.save.<id>`, the list in `hearthbound.family`), each with the previous
good copy in `….backup`. Backup and restore (one hero or the whole family) are on the Hero page.
