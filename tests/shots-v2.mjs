// Phone-size screenshots of the v2 screens, on a seeded demo family.
// Usage: npm run build && npm run preview & ; vite-node tools/seed.ts /tmp/hb-seed.json ; node tests/shots-v2.mjs
import { chromium } from 'playwright-core';
import { mkdtempSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.argv[2] || 'http://localhost:4173/';
const OUT = process.argv[3] || join(process.cwd(), '..', 'shots');
const SEED = JSON.parse(readFileSync(process.argv[4] || '/tmp/hb-seed.json', 'utf8'));
mkdirSync(OUT, { recursive: true });
const errors = [];
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'hb-shots-')), {
  executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true,
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  args: ['--disable-gpu-sandbox', '--no-first-run', '--disk-cache-size=1', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
await ctx.addInitScript((seed) => { if (!localStorage.getItem('hb.seeded')) { for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); localStorage.setItem('hb.seeded', '1'); } }, SEED);
const page = ctx.pages()[0] || (await ctx.newPage());
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = async (name, full = false) => { await page.waitForTimeout(500); await page.screenshot({ path: join(OUT, `v2-${name}.png`), fullPage: full }); console.log('shot', name); };
const hallReady = async () => { await page.waitForSelector('.hall-canvas canvas', { timeout: 20000 }); await page.waitForSelector('.hall-loading', { state: 'detached', timeout: 20000 }); await page.waitForTimeout(1500); };
const tab = (name) => page.locator('nav.tabs button', { hasText: name }).click();

for (const ph of ['day', 'dusk', 'night', 'dawn']) {
  await page.goto(URL + '?phase=' + ph);
  await hallReady();
  await shot('hall-' + ph);
}
await page.goto(URL + '?phase=day');
await hallReady();
await page.locator('.week-card').scrollIntoViewIfNeeded();
await shot('hall-cards');
await page.locator('.story-card').scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 200);
await shot('hall-story-chore');
await page.locator('.card.quest').scrollIntoViewIfNeeded();
await shot('hall-quest');

await tab('Journey');
await shot('journey-story');
for (const [seg, name] of [['Season', 'season'], ['Badges', 'badges'], ['Stats', 'stats'], ['Week', 'week']]) {
  await page.locator('.seg button', { hasText: seg }).click();
  await shot(name);
}
await page.locator('.seg button', { hasText: 'Stats' }).click();
await page.mouse.wheel(0, 700);
await shot('stats-2');

await tab('Oaths');
await page.locator('.seg button', { hasText: 'Big tasks' }).click();
await shot('bigtasks');
await page.locator('.chore .as-btn').first().click();
await shot('bigtasks-open');
await page.locator('.fab').click();
await shot('chore-form');
await page.keyboard.press('Escape');

await tab('Hero');
await page.locator('.kicker', { hasText: 'Daily reminder' }).scrollIntoViewIfNeeded();
await shot('settings-reminders');
await page.locator('.kicker', { hasText: 'Backup' }).scrollIntoViewIfNeeded();
await shot('settings-backup');
await page.locator('.growth').scrollIntoViewIfNeeded();
await shot('hero-familiar');

await tab('Hall');
await page.waitForTimeout(600);
await page.locator('.hearth button', { hasText: 'Rest days' }).click();
await shot('rest');
await page.keyboard.press('Escape');

await page.locator('.herostrip .who').first().click();
await shot('family');
await page.locator('.pickm', { hasText: 'Teegan' }).click();
await page.waitForTimeout(800);
await shot('gentle');
await page.locator('.card.tiny').scrollIntoViewIfNeeded();
await shot('gentle-tiny');
await page.locator('.herostrip .who').first().click();
await page.locator('.pickm', { hasText: 'Emma' }).click();
await page.waitForTimeout(1200);
await shot('kid');
await page.mouse.wheel(0, 600);
await shot('kid-2');
const k = page.locator('.kid-oath:not(.done)').first();
if (await k.count()) { await k.click(); await page.waitForTimeout(400); await shot('kid-kept'); }

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await ctx.close();
