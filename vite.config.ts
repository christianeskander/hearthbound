import { defineConfig, type Plugin } from 'vite';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

/** Writes dist/sw.js with a precache list of every built file, so the game works offline. */
function serviceWorker(): Plugin {
  return {
    name: 'hb-sw',
    apply: 'build',
    closeBundle() {
      const dist = join(process.cwd(), 'dist');
      const files: string[] = [];
      const walk = (d: string) => {
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) walk(p);
          else if (!f.endsWith('.map') && f !== 'sw.js') files.push('./' + relative(dist, p).split('\\').join('/'));
        }
      };
      walk(dist);
      const h = createHash('sha1');
      for (const f of files.sort()) h.update(f).update(readFileSync(join(dist, f)));
      const version = h.digest('hex').slice(0, 10);
      const tpl = readFileSync(join(process.cwd(), 'src', 'sw.template.js'), 'utf8');
      writeFileSync(join(dist, 'sw.js'), tpl.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(['./', ...files])));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  build: { target: 'es2020', chunkSizeWarningLimit: 1600, reportCompressedSize: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
} as any);
