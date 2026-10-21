# Hearthbound balance pass (v3) — compared with Habitica

Reference: Habitica's open-source rules (HabitRPG/habitica, GPL-3.0), read on 21 Oct 2026:
`ops/scoreTask.js`, `server/libs/cron.js`, `statHelpers.js`, `fns/randomDrop.js`, `fns/crit.js`,
the quest and gear content. I used them only for numbers and ideas. No Habitica code was copied.
Hearthbound's rules are its own code in `src/engine/`.

How it was measured: `npm run sim` (`tools/sim.ts`) plays 24 heroes of each type for 180 days
through the real engine. Each hero has 3–5 dailies, three habits and an errand every 4 days. It
also runs a rough Habitica reference model with the same players. The player types are steady
(keeps about 90%), average (about 60%) and struggling (about 30%). There are two extra types. A
"hands-off" struggler never rests, kindles, forges or spends points. A "min-maxer" taps one
habit 15 times a day.

## Side by side (after this pass)

| | Hearthbound v3 | Habitica (rules + reference model) |
|---|---|---|
| XP for the next level | 40, 70, 105 … L10 510, L20 1600 (gaps grow with the square of the level) | 25, 50, 75, 100, 150, then about l²/4+10l+140 (L10 260, L20 440) |
| Level by day 30 / 180: steady | 11.5 / 22 | 8 / 20 |
| Level by day 30 / 180: average | 10 / 19 | 7 / 16 |
| Level by day 30 / 180: struggling | 7.6 / 15 | 4.4 / 4 (stuck: deaths cost a level) |
| Gold per day: steady / average / struggling | about 23 / 15 / 9 | about 11 / 8 / 6 |
| First useful gear | 70–90 gold, bought on day 4 / 6 / 11 | 15–30 gold, day 3 / 4 / 8 |
| What a missed daily costs | trivial 1, easy 3, steady 4, hard 6 vitality (out of 50+). A boss adds 1–2. One dawn takes at most 40% | about 2 × difficulty (1–4), growing as the task goes red. Boss adds str × miss. No cap |
| Recovery | +2 at dawn for everyone (Soot +2 more), +1 per kept daily or errand, Rest, tonics, level-up refill | level-up refill and 25-gold potions only |
| Hitting zero | lose 10% gold and half this level's XP | lose a level, all gold and one piece of gear |
| Falls, struggling player | 0 per fortnight if they use Rest; 0.7 if fully hands-off | about 1.9 per fortnight |
| Comeback help | "Rekindle": a daily missed on recent nights pays +25% per miss in a row (up to +75%) when you pick it back up | red tasks pay more (task value rises as it's neglected) and also hurt more |
| Streak bonus | +2.5% a day up to +30% (XP and gold) | +1% a day on gold, no cap |
| Habit spam | repeat taps fade: ×1, ×0.6, ×0.36 … floor ×0.1. Habits don't build the combo | task value rises, so rewards fade slowly |
| First boss / second boss, average player | 7 days / 11 days | about 21 days for a 100-HP starter boss solo |

## Problems found (before this pass)

1. **Levels came too fast, and at a flat rate.** The curve was linear (60 + 30 per level). A steady
   player hit L13 in a month and L35 by month six. All 9 perks were unlocked within about 10
   days, and later levels felt the same as early ones.
2. **The market was bought out in weeks.** A steady player owned 11 of 12 bonus items by day 30
   and got the first one on day 2. The gear was too cheap for the gold coming in.
3. **Habit + was a money tap.** Each + paid full price and also climbed the combo. Fifteen taps a
   day gave 4× the gold and XP of honest play, and both bosses fell on day 1.
4. **Bosses died in days.** The Slime took 3 days (steady) or 5 days (average). The Rat took 4 or
   8 days.
5. **Struggling players fell too often, mostly at the start.** Misses cost about twice Habitica's
   damage. A boss added 3–5 more for every miss. Only Soot gave any regen. A hands-off
   struggling player fell 2.3 times a fortnight (one hero fell 43 times in 180 days). A fall
   wiped the whole level's progress.
6. **There was no way back.** A struggler earned about ¼ of a steady player's gold. A big streak
   bonus (+50%) widened the gap, and a returning player had nothing pulling them back.
7. **Checked and fine:** perks add about 7% to income (no-perk control run). Omens average about
   +4% (Omen Reader about +7%). After the habit fix, the combo is bounded (x1.5–1.7 on a few
   keeps). None of these break the economy.

## Changes made (and why)

1. **Level curve:** `60 + 30(L−1)` became `40 + 25n + 3n²` (rounded to 5). The first level now
   takes a day, not two, and later levels take longer. A steady player is about L11 at a month
   and L22 at six months, close to Habitica's pace.
2. **Market prices about ×2:** hood 70, cap/boots 80, cloaks 90–120, jerkin 150, kettle and
   sabatons 240, chain 280, greaves 300. Familiars went to 50–90. Cosmetic shirt and trousers
   stay at 25–30 as cheap early treats. The first useful gear now takes 3–4 days of good play,
   and a full set takes about 3 months for a steady player and 5–6 for an average one.
3. **Habit taps fade within a day:** each extra + on the same habit pays ×0.6 of the last, never
   below ×0.1 (always at least 1 XP). The count resets at dawn. Habits no longer raise the combo.
   The 15-taps-a-day player now earns only about 10% more gold than an honest steady player.
4. **Bosses tougher, with fair rewards:** Slime 80 → 130 HP (gold 60 → 80, XP 100 → 150). Rat
   150 → 260 HP (gold 120 → 160, XP 180 → 300). An average player now needs about 7 and 11 days.
   Their bite per miss went from 3/5 to 1/2 and is now softened by miss-reduction like any miss.
5. **Gentler misses, with a safety net:** damage is now 1/3/4/6 (was 2/4/6/9). Everyone mends 2
   vitality at dawn (Soot adds 2 more). Each kept daily or errand gives +1. No single dawn can
   take more than 40% of max vitality, and the dawn report says when the hearth "caught you".
   You always see a fall coming.
6. **Rekindle (comeback bonus):** each daily remembers how many nights in a row it was missed
   (`cold`, 0–3). Keeping it again pays +25% per miss (up to +75%) on XP, gold and boss damage,
   then resets. The Hall shows "Welcome back to this one…" and the dawn report mentions it. This
   is the kind side of Habitica's red-task value, without the extra damage.
7. **Streak bonus capped lower:** +2.5% a day now stops at +30% after 12 days (was +50% at 20).
   Missing one day no longer cuts income by a third.
8. **Softer fall:** you now lose half this level's progress (was all of it), plus 10% gold as
   before. The message says exactly that. Gear, titles and streak records stay.

**Save compatibility:** saves go to version 3. Old oaths get `cold: 0`. Because the early levels
got shorter, any XP already past the new bar is turned into levels and skill points when the save
loads, so nobody loses progress. Owned gear stays owned at the old prices.

## Key results after the fixes (24 heroes each, means)

| Player | Level d30 / d90 / d180 | Gold per day | First gear | Falls per fortnight | Slime / Rat |
|---|---|---|---|---|---|
| Steady 90% | 11.5 / 17.3 / 22.4 | 28 → 23 | day 4 | 0 | 4 / 8 days |
| Average 60% | 9.9 / 14.5 / 18.7 | 20 → 15 | day 6 | 0 | 7 / 11 days |
| Struggling 30% | 7.6 / 11.9 / 15.3 | 11 → 9 | day 11 | 0 (was 0.2, all in month 1) | 13 / 21 days |
| Struggling, hands-off | 7.2 / 10.8 / 13.3 | 11 → 9 | day 11 | 0.7 (was 2.3) | 12 / 21 days |
| Min-maxer (15 taps/day) | 13.5 / 20.2 / 26.3 | 31 → 25 (was 95) | day 4 (was 1) | 0 | 4 / 5 days (was 1 / 1) |


# v4 (Hearthbound v2): new rewards, same economy

v2 added four foes, a story, a monthly season track, badges and familiar growth.
Every new source of gold was sized so the v3 economy (commit 98b5c52) stays put.
`npm run sim` covers all of it: simulated players fight every foe in order,
claim story chapters and take season tiers.

| Player (24 heroes, day 180) | v3 gold/day | v4 gold/day | Change | Falls per fortnight |
|---|---|---|---|---|
| Steady 90% | 22.8 | 24.6 | +8% | 0 |
| Average 60% | 14.5 | 16.0 | +10% | 0 |
| Struggling 30% | 8.9 | 10.1 | +13% | 0 |
| Struggling, hands-off | — | 9.5 | — | 1.2 (v3: 0.7) |
| Min-maxer (15 taps/day) | 25 | 27.0 | +8% | 0 |

Design notes:

- **New foes pay less gold per HP than the Slime and the Rat** (Drift 25, Maybe 30,
  Gleam 35, Weight 40 gold; power 1 each, so a missed daily costs 1 vitality,
  the same as the Slime). Their main reward is a title and a cosmetic cloak, not gold.
  My first pass paid +25% gold and doubled the hands-off falls, so it was cut.
- **Season track: 15 gold a month in total** (3 + 5 + 7); the other tiers are
  materials, an ember, a title and a cloak. It resets monthly and is free.
- **Story: about 220 gold once**, spread over 8 chapters and many weeks.
- **Badges give nothing but the badge.** No gold, so there is nothing to grind.
- **Familiar growth is cosmetic** (size, aura, a pat). Migration sets every owned
  familiar to Young and the active one higher by its keeps, so nobody starts over.
- **Rest days** stop all dawn penalties; the sim does not use them, so real
  struggling players do better than the table.
- **Kid and gentle heroes** have no penalties at all, so balance does not apply to them.
- **The hands-off struggler** falls 1.2 times per fortnight instead of 0.7, because the
  sim walks them into every new foe automatically, and each foe bites at dawn. In the
  app a foe is only fought after you invite it on the Hall, and "Turn back" is always there.
