// Keeps node_modules lean: Phaser ships ~150 MB of sources, maps and builds;
// the game only imports dist/phaser.esm.js (and tsc reads types/phaser.d.ts).
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
const root = join(process.cwd(), 'node_modules', 'phaser');
if (existsSync(root)) {
  for (const d of ['src', 'plugins', 'changelog']) rmSync(join(root, d), { recursive: true, force: true });
  rmSync(join(root, 'types', 'phaser.json'), { force: true });
  const dist = join(root, 'dist');
  if (existsSync(dist)) for (const f of readdirSync(dist)) if (f !== 'phaser.esm.js') rmSync(join(dist, f), { recursive: true, force: true });
  console.log('phaser trimmed to dist/phaser.esm.js + types');
}
