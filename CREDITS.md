# Credits

Hearthbound's code is original. Every image in `public/assets/` comes from the
open-licensed pixel art listed below. `tools/build_assets.py` downloads exactly
these files and writes the game assets, so the list below is complete: if a
file is not named here, it is not in the game.

**What was changed, everywhere:** frames were cut out of the original sheets
and laid out as strips; magenta key colour removed and fully transparent pixels
zeroed (no colour fringes); sprite alpha made 1-bit. Further changes are listed
per item. Hero layers are recoloured at runtime (skin, hair and cloth colours
are swapped index-for-index using the generator's own palette ramps).

Licences: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) ·
[CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/) ·
[CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) ·
[CC-BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) ·
[OGA-BY 3.0](https://opengameart.org/content/oga-by-30-faq) ·
[GPL 3.0](https://www.gnu.org/licenses/gpl-3.0.html).
Where an LPC asset is offered under several licences, Hearthbound uses it under
**CC-BY-SA 3.0** (or OGA-BY 3.0 where that is the only one listed), and the
modified sprite files in `public/assets/hero/` are shared under the same licence.

## Hero (Liberated Pixel Cup, via the Universal LPC Spritesheet Character Generator)

Source: <https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator>
(files under `spritesheets/`; authors and licences copied from that project's `CREDITS.csv`).
Kept: the right-facing walk row (stand + 8 frames) plus the front-facing stand.

| Game file | Source file | Authors | Licences | More |
|---|---|---|---|---|
| `hero/body_male.png` | `spritesheets/body/bodies/male/walk.png` | bluecarrot16,JaidynReiman,Benjamin K. Smith (BenCreating),Evert,Eliza Wyatt (ElizaWy),TheraHedwig,MuffinElZangano,Durrani,Johannes Sjölund (wulax),Stephen Challener (Redshrike) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/body_female.png` | `spritesheets/body/bodies/female/walk.png` | Benjamin K. Smith (BenCreating),bluecarrot16,TheraHedwig,Evert,MuffinElZangano,Durrani,Pierre Vigier (pvigier),ElizaWy,Matthew Krohn (makrohn),Johannes Sjölund (wulax),Stephen Challener (Redshrike) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/head_male.png` | `spritesheets/head/heads/human/male/walk.png` | bluecarrot16,Benjamin K. Smith (BenCreating),Stephen Challener (Redshrike) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/head_female.png` | `spritesheets/head/heads/human/female/walk.png` | bluecarrot16,Benjamin K. Smith (BenCreating),Stephen Challener (Redshrike) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/ |
| `hero/eyes.png` | `spritesheets/eyes/human/adult/default/walk.png` | Stephen Challener (Redshrike), JaidynReiman, ElizaWy | OGA-BY 3.0, CC-BY-SA 3.0, GPL 3.0 | https://opengameart.org/content/lpc-character-bases |
| `hero/hair_plain.png` | `spritesheets/hair/plain/adult/walk.png` | JaidynReiman,Manuel Riecke (MrBeast),Joe White | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/hair_ponytail.png` | `spritesheets/hair/ponytail/adult/fg/walk.png` | JaidynReiman,Manuel Riecke (MrBeast) | CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/hair_ponytail_bg.png` | `spritesheets/hair/ponytail/adult/bg/walk.png` | JaidynReiman,Manuel Riecke (MrBeast) | CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/hair_bob.png` | `spritesheets/hair/bob/adult/walk.png` | ElizaWy,bluecarrot16 | CC0 | https://opengameart.org/content/lpc-hair |
| `hero/hair_long.png` | `spritesheets/hair/long/adult/walk.png` | JaidynReiman,Manuel Riecke (MrBeast) | CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/hair_messy.png` | `spritesheets/hair/messy1/adult/walk.png` | JaidynReiman,Manuel Riecke (MrBeast) | CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/hair_pixie.png` | `spritesheets/hair/pixie/adult/walk.png` | JaidynReiman,Manuel Riecke (MrBeast) | CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/hair_buzz.png` | `spritesheets/hair/buzzcut/adult/walk.png` | ElizaWy | OGA-BY 3.0 | https://opengameart.org/content/lpc-hair |
| `hero/hair_bangs.png` | `spritesheets/hair/bangs/adult/walk.png` | JaidynReiman,Manuel Riecke (MrBeast) | CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/shirt_long_m.png` | `spritesheets/torso/clothes/longsleeve/longsleeve/male/walk.png` | JaidynReiman,Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/shirt_long_f.png` | `spritesheets/torso/clothes/longsleeve/longsleeve/female/walk.png` | bluecarrot16,ElizaWy,JaidynReiman,Stephen Challener (Redshrike) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/shirt_short_m.png` | `spritesheets/torso/clothes/shortsleeve/shortsleeve/male/walk.png` | bluecarrot16,ElizaWy,JaidynReiman,Stephen Challener (Redshrike) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/shirt_short_f.png` | `spritesheets/torso/clothes/shortsleeve/shortsleeve/female/walk.png` | bluecarrot16,ElizaWy,JaidynReiman,Stephen Challener (Redshrike) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/leather_m.png` | `spritesheets/torso/armour/leather/male/walk.png` | Johannes Sjölund (wulax),bluecarrot16,JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/leather_f.png` | `spritesheets/torso/armour/leather/female/walk.png` | Michael Whitlock (bigbeargames),Matthew Krohn (makrohn),Johannes Sjölund (wulax),bluecarrot16,JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/chain_m.png` | `spritesheets/torso/chainmail/male/walk.png` | Johannes Sjölund (wulax),Napsio (Vitruvian Studio),JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/chain_f.png` | `spritesheets/torso/chainmail/female/walk.png` | Johannes Sjölund (wulax),Napsio (Vitruvian Studio),JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/plate_m.png` | `spritesheets/torso/armour/plate/male/walk.png` | Napsio (Vitruvian Studio),JaidynReiman,bluecarrot16,Michael Whitlock (bigbeargames),Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/plate_f.png` | `spritesheets/torso/armour/plate/female/walk.png` | JaidynReiman,bluecarrot16,Michael Whitlock (bigbeargames),Matthew Krohn (makrohn),Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/belt_m.png` | `spritesheets/torso/waist/belt_leather/male/walk.png` | bluecarrot16,Johannes Sjölund (wulax),Matthew Krohn (makrohn) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-combat-armor-for-women |
| `hero/belt_f.png` | `spritesheets/torso/waist/belt_leather/female/walk.png` | bluecarrot16,Johannes Sjölund (wulax),Matthew Krohn (makrohn) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-combat-armor-for-women |
| `hero/pants_m.png` | `spritesheets/legs/pants/male/walk.png` | bluecarrot16,JaidynReiman,ElizaWy,Matthew Krohn (makrohn),Johannes Sjölund (wulax),Stephen Challener (Redshrike) | OGA-BY 3.0,GPL 3.0,CC-BY-SA 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/pants_f.png` | `spritesheets/legs/pants/thin/walk.png` | bluecarrot16,JaidynReiman,ElizaWy,Joe White,Matthew Krohn (makrohn),Johannes Sjölund (wulax),Stephen Challener (Redshrike) | OGA-BY 3.0,GPL 3.0,CC-BY-SA 3.0 | https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles |
| `hero/skirt_f.png` | `spritesheets/legs/skirts/plain/thin/walk.png` | bluecarrot16,Pierre Vigier (pvigier),Johannes Sjölund (wulax),Ahmad3366,JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/skirt_m.png` | `spritesheets/legs/skirts/plain/male/walk.png` | bluecarrot16,Pierre Vigier (pvigier),Johannes Sjölund (wulax),Ahmad3366,JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/greaves_m.png` | `spritesheets/legs/armour/plate/male/walk.png` | bluecarrot16,JaidynReiman,Michael Whitlock (bigbeargames),Matthew Krohn (makrohn),Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/greaves_f.png` | `spritesheets/legs/armour/plate/thin/walk.png` | bluecarrot16,JaidynReiman,Michael Whitlock (bigbeargames),Matthew Krohn (makrohn),Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/shoes_m.png` | `spritesheets/feet/shoes/basic/male/walk.png` | JaidynReiman,bluecarrot16,Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/shoes_f.png` | `spritesheets/feet/shoes/basic/thin/walk.png` | JaidynReiman,Joe White,Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/boots_m.png` | `spritesheets/feet/boots/basic/male/walk.png` | JaidynReiman,bluecarrot16,Nila122 | OGA-BY 3.0,CC-BY-SA 3.0,GPL 2.0,GPL 3.0 | https://opengameart.org/content/lpc-clothes-and-hair |
| `hero/boots_f.png` | `spritesheets/feet/boots/basic/thin/walk.png` | JaidynReiman,bluecarrot16,Nila122 | OGA-BY 3.0,CC-BY-SA 3.0,GPL 2.0,GPL 3.0 | https://opengameart.org/content/lpc-clothes-and-hair |
| `hero/sabatons_m.png` | `spritesheets/feet/armour/plate/male/walk.png` | Matthew Krohn (makrohn),Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/sabatons_f.png` | `spritesheets/feet/armour/plate/thin/walk.png` | Matthew Krohn (makrohn),Johannes Sjölund (wulax) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/cape_fg.png` | `spritesheets/cape/solid/fg/walk.png` | bluecarrot16,JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-curly-hair-elven-ears-white-cape-with-blue-trim-and-more |
| `hero/cape_bg.png` | `spritesheets/cape/solid/bg/walk.png` | Nila122,JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-curly-hair-elven-ears-white-cape-with-blue-trim-and-more |
| `hero/hood.png` | `spritesheets/hat/cloth/hood/adult/walk.png` | Johannes Sjölund (wulax),JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/cap.png` | `spritesheets/hat/cloth/leather_cap/adult/walk.png` | Johannes Sjölund (wulax),Matthew Krohn (Makrohn),JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/cap_feather.png` | `spritesheets/hat/cloth/leather_cap/feather/adult/walk.png` | Johannes Sjölund (wulax),Matthew Krohn (Makrohn),JaidynReiman | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |
| `hero/kettle.png` | `spritesheets/hat/helmet/kettle/adult/walk.png` | Johannes Sjölund (wulax),JaidynReiman,Napsio (Vitruvian Studio) | OGA-BY 3.0,CC-BY-SA 3.0,GPL 3.0 | https://opengameart.org/content/lpc-medieval-fantasy-character-sprites |

The `hero/eyes.png` row: this file has no line of its own in the generator's
CREDITS.csv; it is the LPC base human eye layer, credited to the people above as the
generator credits its face layers.

## Familiars

| Game file | Source | Author | Licence | Changes |
|---|---|---|---|---|
| `pets/soot.png` (Soot, cat) | "[LPC] Cats and Dogs", `cat_0.png`, grey coat walk frames — <https://opengameart.org/content/lpc-cats-and-dogs> | bluecarrot16 (based on LPC work by Stephen Challener (Redshrike) and others, see page) | CC-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0 (used under CC-BY-SA 3.0) | Downscaled to 75% with a palette-preserving pixel filter so the cat stands at true size next to the hero |
| `pets/hazel.png` (Hazel, hound) | same pack, `dog_2.png`, brown coat | bluecarrot16 | as above | Cropped only |
| `pets/inkling.png` (Inkling, raven) | "[LPC] Birds", `bird_2_black.png` — <https://opengameart.org/content/lpc-birds> | bluecarrot16, commissioned by castelonia | CC-BY 4.0 / CC-BY-SA 4.0 / GPL 3.0 / OGA-BY 3.0 (used under CC-BY 4.0) | Fly and walk rows combined |
| `pets/bramble.png` (Bramble, fox) | "[LPC] bears, deer, lions and more" (LPC animals 2022), `fox, woods.png` — <https://opengameart.org/content/lpc-bears-deer-lions-and-more> | tapatilorenzo | CC-BY 4.0 (author also offers originals as CC0) | Downscaled to 60% to true size |
| `pets/pip.png` (Pip, field mouse) | same pack, `mouse, gray.png` | tapatilorenzo | CC-BY 4.0 | Downscaled to 50% (still a little larger than life, so it can be seen) |

## Foes

| Game file | Source | Author | Licence | Changes |
|---|---|---|---|---|
| `bosses/slime.png` (The Slime of Later) | "Animated Slime" — <https://opengameart.org/content/animated-slime> | Calciumtrice | CC-BY 3.0 | Green rows only; doubled with the Scale2x pixel-art algorithm so it is boss-sized on the same pixel grid as the hero |
| `bosses/rat.png` (The Gnawing Doubt) | LPC animals 2022 pack, `giant rat (Sevarihk).png` — <https://opengameart.org/content/lpc-bears-deer-lions-and-more> | Sevarihk (in tapatilorenzo's pack) | CC-BY 4.0 (attribution required) | Walk / attack / die frames cut into a strip |
| `bosses/drift.png` (The Drift) | "Animated Slime" (blue rows) — <https://opengameart.org/content/animated-slime> | Calciumtrice | CC-BY 3.0 | Blue rows only; Scale2x |
| `bosses/gleam.png` (The Gleam of Perfect) | same sheet (red rows) | Calciumtrice | CC-BY 3.0 | Red rows only; Scale2x |
| `bosses/maybe.png` (The Mushroom of Maybe) | LPC animals 2022 pack, `mushroom walker, fly amanita (Sevarihk).png` — <https://opengameart.org/content/lpc-bears-deer-lions-and-more> | Sevarihk (in tapatilorenzo's pack) | CC-BY 4.0 | Walk row cut out; Scale2x |
| `bosses/weight.png` (The Weight of Everything) | same pack, `bear, black.png` | tapatilorenzo | CC-BY 4.0 | Walk and lie-down frames cut into one strip |

## Places (all by Luis Zuno, "ansimuz", all CC0)

| Game files | Source | Changes |
|---|---|---|
| `bg/inn/*` (The Inn Yard) | "Gothicvania Town" (`gothicvania-town-files.zip`) — <https://opengameart.org/content/gothicvania-town> | Sky and far town cropped to 160px; a yard street composed from the pack's own well, barrels, lamp, wagon, crates and sign on its cobble tile |
| `bg/road/*` (The North Road) | "Country Side Platform Tiles" — <https://opengameart.org/content/country-side-platform-tiles> | Back layer cropped; one tree and a ground strip cut from the tileset |
| `bg/wood/*` (The Old Wood) | "Forest Background" — <https://opengameart.org/content/forest-background> | None besides cleaning |
| `bg/coast/*` (The Salt Coast) | "Warped Ocean View" — <https://opengameart.org/content/warped-ocean-view> | Sky and sea cropped and stacked; country-side ground strip added |
| `bg/ridge/*` (Ember Ridge) | "Mountain at Dusk Background" — <https://opengameart.org/content/mountain-at-dusk-background> | Country-side ground strip tinted to dusk |

## Icons

`public/icons/*` (app icons, maskable icons, Apple touch icon, favicon, shortcut
icons and the notification badge) are drawn by `tools/make_icons.py` from the LPC
hero layers above and from the game's own hand-made pixel icons in
`src/ui/icons.tsx` (same credits and licences; the pixel icons are original to
this project).

The emoji on kid and tiny-win cards are the phone's own emoji font; no emoji
images are shipped.

## Code and libraries

- Phaser 3 (MIT) — <https://phaser.io>
- Preact (MIT) — <https://preactjs.com>
- Built with Vite and TypeScript (MIT / Apache-2.0); tests with Vitest (MIT) and Playwright (Apache-2.0).

Sounds and the calm music are synthesised live in the browser with the Web Audio API
(original to this project); there are no sound or music files.

No code from Habitica (GPL) or any other habit app was used; the game rules,
story and texts are original.
