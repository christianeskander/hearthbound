# Hearthbound

A small pixel-art RPG habit tracker for your phone. Keep your daily oaths, earn
gold and XP, dress your hero, and wear down the Slime of Later. Installable,
works offline, and everything stays on the device (no account, no network).

## Run it

```sh
npm install          # also trims Phaser to the one file the game uses (postinstall)
npm run dev          # local dev server
npm test             # unit tests (day turn, streaks, embers, combo, damage, rewards, save/migrate)
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
- `src/ui/` is Preact: creation, Hall, Oaths, Market, Hero.

Saves live in `localStorage` (`hearthbound.save`) with the previous good copy
kept in `hearthbound.save.backup`. Export/import is on the Hero page.
