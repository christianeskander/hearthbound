// Builds the hero's sprite strip at runtime: each LPC layer is recoloured from
// its source ramp to the chosen ramp (exact index-for-index colour swap, so no
// blending and no fringes), then stacked in z-order into one 640x64 strip.
// Frame 0 = stand (side), 1-8 = walk cycle (side), 9 = stand (front).
import { RAMPS, SOURCE } from './palettes';
import { partsFor, type Part } from './look';
import type { Look, Slot } from '../engine/types';

export const FRAME = 64;
export const STRIP_W = FRAME * 10;
const BASE = import.meta.env.BASE_URL + 'assets/';

const imgCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(path: string): Promise<HTMLImageElement> {
  let p = imgCache.get(path);
  if (!p) {
    p = new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error('Could not load ' + path));
      im.src = BASE + path;
    });
    imgCache.set(path, p);
  }
  return p;
}

const hex = (h: string) => parseInt(h.slice(1), 16);
const partCache = new Map<string, Promise<HTMLCanvasElement>>();

function recolor(im: HTMLImageElement, part: Part): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(im, 0, 0);
  if (!part.pal || !part.color) return c;
  const from = SOURCE[part.pal];
  const to = RAMPS[part.pal]?.[part.color];
  if (!from || !to || to === from) return c;
  const map = new Map<number, number>();
  from.forEach((f, i) => map.set(hex(f), hex(to[i] ?? to[to.length - 1])));
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const v = map.get((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]);
    if (v !== undefined) { px[i] = v >> 16; px[i + 1] = (v >> 8) & 255; px[i + 2] = v & 255; }
  }
  g.putImageData(d, 0, 0);
  return c;
}

function partCanvas(p: Part) {
  const key = `${p.file}:${p.pal}:${p.color}`;
  let c = partCache.get(key);
  if (!c) { c = loadImage(`hero/${p.file}.png`).then((im) => recolor(im, p)); partCache.set(key, c); }
  return c;
}

export async function composeHero(look: Look, equipped: Partial<Record<Slot, string>>): Promise<HTMLCanvasElement> {
  const parts = partsFor(look, equipped);
  const layers = await Promise.all(parts.map(partCanvas));
  const c = document.createElement('canvas');
  c.width = STRIP_W; c.height = FRAME;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  for (const l of layers) g.drawImage(l, 0, 0);
  return c;
}
