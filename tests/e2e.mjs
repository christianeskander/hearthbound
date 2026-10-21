// End-to-end smoke test at phone size (390x844) using the system Chrome.
// Usage: start `npm run preview`, then `node tests/e2e.mjs [url] [shotsDir]`.
import { chromium } from 'playwright-core';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL = process.argv[2] || 'http://localhost:4173/';
const OUT = process.argv[3] || join(process.cwd(), '..', 'shots');
mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'hb-chrome-'));
const errors = [];
const fail = (m) => { throw new Error(m); };

const ctx = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.CHROME || '/usr/bin/google-chrome',
  headless: true,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  args: ['--disable-gpu-sandbox', '--no-first-run', '--disk-cache-size=1', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // 1. Character creation
  await page.waitForSelector('.create');
  await page.fill('#hero-name', 'Christian');
  await page.getByRole('radio', { name: 'Man', exact: true }).click();
  await page.getByRole('radio', { name: 'Messy', exact: true }).click().catch(() => {});
  await page.locator('.cards2 .pick', { hasText: 'Pathfinder' }).click();
  await page.locator('.pick.fam', { hasText: 'Soot' }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, '01-create.png') });
  await page.screenshot({ path: join(OUT, '01-create-full.png'), fullPage: true });
  await page.locator('button.primary.big').click();

  // 2. Hall: two frames ~200ms apart
  await page.waitForSelector('.hall-canvas canvas');
  await page.waitForSelector('.hall-loading', { state: 'detached' });
  await page.waitForTimeout(1200);
  const hall = page.locator('section.hall');
  await page.screenshot({ path: join(OUT, '02-hall-a.png') });
  await hall.screenshot({ path: join(OUT, '02-hall-crop-a.png') });
  await page.waitForTimeout(200);
  await hall.screenshot({ path: join(OUT, '02-hall-crop-b.png') });
  await page.screenshot({ path: join(OUT, '02-hall-b.png') });

  // 3. Keep the next daily
  const goldBefore = Number((await page.locator('.purse .gold').innerText()).replace(/\D/g, ''));
  const label = await page.locator('.next .keep').getAttribute('aria-label');
  await page.locator('.next .keep').click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(OUT, '03-hall-kept.png') });
  const goldAfter = Number((await page.locator('.purse .gold').innerText()).replace(/\D/g, ''));
  if (!(goldAfter > goldBefore)) fail(`gold did not rise after keeping (${goldBefore} -> ${goldAfter})`);
  console.log(`kept: ${label}; gold ${goldBefore} -> ${goldAfter}`);

  // 3b. Face the Slime of Later and look at the travel sheet
  await page.locator('.quest .foe-row button', { hasText: 'Face it' }).first().click();
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('section.hall').screenshot({ path: join(OUT, '08-boss.png') });
  await page.locator('.hall .chip').first().click();
  await page.waitForSelector('.sheet');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '09-travel.png') });
  await page.locator('.sheet header button').click();

  // 4. Each tab
  for (const [tab, file] of [['Oaths', '04-oaths'], ['Market', '05-market'], ['Hero', '06-hero']]) {
    await page.locator('nav.tabs button', { hasText: tab }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(OUT, file + '.png') });
    await page.screenshot({ path: join(OUT, file + '-full.png'), fullPage: true });
  }
  await page.locator('nav.tabs button', { hasText: 'Oaths' }).click();
  await page.getByRole('tab', { name: 'Habits' }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(OUT, '07-habits.png') });

  // 4b. Make a new daily, tap a habit, add a reward, change body
  await page.getByRole('tab', { name: 'Dailies' }).click();
  await page.locator('button.fab').click();
  await page.waitForSelector('.sheet');
  await page.locator('.sheet input').first().fill('Take meds with breakfast');
  await page.locator('.sheet .pill', { hasText: 'Hard' }).click();
  await page.screenshot({ path: join(OUT, '10-new-oath.png') });
  await page.locator('.sheet button[type=submit]').click();
  await page.waitForSelector('.oath >> text=Take meds with breakfast');
  await page.getByRole('tab', { name: 'Habits' }).click();
  await page.locator('.hbtn.plus:not([disabled])').first().click();
  await page.waitForTimeout(300);
  await page.locator('nav.tabs button', { hasText: 'Market' }).click();
  await page.getByRole('tab', { name: 'Familiars' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, '11-familiars.png') });
  await page.getByRole('tab', { name: 'Rewards' }).click();
  await page.locator('button', { hasText: '+ Add a reward' }).click();
  await page.locator('.sheet input').first().fill('A pastry from the good bakery');
  await page.locator('.sheet button[type=submit]').click();
  await page.waitForSelector('.reward >> text=A pastry from the good bakery');
  await page.locator('nav.tabs button', { hasText: 'Hero' }).click();
  await page.locator('button', { hasText: 'Change look' }).click();
  await page.locator('.sheet .pill', { hasText: 'Woman' }).click();
  await page.locator('.sheet .pill', { hasText: 'Ponytail' }).click().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '12-look-woman.png') });
  await page.locator('.sheet button.primary', { hasText: 'Done' }).click();
  await page.locator('nav.tabs button', { hasText: 'Hall' }).click();
  await page.waitForTimeout(1200);
  await page.locator('section.hall').screenshot({ path: join(OUT, '13-hall-woman.png') });

  // 5. Reload: the save must persist
  await page.reload();
  await page.waitForSelector('.herostrip');
  const name = await page.locator('.herostrip .who b').innerText();
  if (name !== 'Christian') fail('save did not persist: ' + name);
  const saved = await page.evaluate(() => !!localStorage.getItem('hearthbound.save') && !!localStorage.getItem('hearthbound.save.backup'));
  console.log('persisted after reload, backup present:', saved);
  if (errors.length) fail('browser errors:\n' + errors.join('\n'));
  console.log('E2E OK');
} finally {
  await ctx.close();
  rmSync(profile, { recursive: true, force: true });
}
