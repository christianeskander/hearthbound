import { useEffect, useRef } from 'preact/hooks';
import { composeHero, loadImage } from '../art/compose';
import { PET_ART } from '../art/look';
import { PLACES, STRIDE_PX, VIEW_H, WALK_MS } from '../hall/layers';
import type { Look, Slot } from '../engine/types';

interface Props {
  look: Look;
  equipped: Partial<Record<Slot, string>>;
  pet?: string | null;
  place?: string | null; // draw a scrolling location behind
  w: number; // scene px
  h?: number;
  zoom?: number; // CSS px per scene px
  still?: 'side' | 'front' | null;
  label?: string;
}

/** A small canvas stage for previews (creation, market try-on, hero page). Same art and timing as the hall. */
export function Stage({ look, equipped, pet = null, place = null, w, h = 80, zoom = 2, still = null, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([look, equipped, pet, place, w, h, still]);
  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
    const k = Math.max(1, Math.round(zoom * dpr));
    c.width = w * k; c.height = h * k;
    c.style.width = (w * k) / dpr + 'px'; c.style.height = (h * k) / dpr + 'px';
    const g = c.getContext('2d')!;
    let raf = 0, alive = true, visible = true;
    const pl = place ? PLACES[place] : null;
    const ground = pl ? pl.ground - (VIEW_H - h) : h - 6;
    Promise.all([
      composeHero(look, equipped),
      pet && PET_ART[pet] ? loadImage(PET_ART[pet].file) : Promise.resolve(null),
      pl ? Promise.all(pl.layers.map((l) => loadImage('bg/' + l.key + '.png'))) : Promise.resolve([] as HTMLImageElement[]),
    ]).then(([hero, petImg, layers]) => {
      if (!alive) return;
      const t0 = performance.now();
      const draw = (now: number) => {
        if (!alive) return;
        const t = now - t0;
        g.setTransform(k, 0, 0, k, 0, 0);
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, w, h);
        const dist = still ? 0 : t * (STRIDE_PX / (8 * WALK_MS));
        if (pl) layers.forEach((im, i) => {
          const l = pl.layers[i];
          const off = Math.floor(dist * l.f + (l.drift ? (t * l.drift) / 1000 : 0)) % im.width;
          for (let x = -off; x < w; x += im.width) g.drawImage(im, x, h - VIEW_H);
        });
        const frame = still === 'front' ? 9 : still === 'side' ? 0 : 1 + (Math.floor(t / WALK_MS) % 8);
        const hx = Math.round(w / 2 - 32 + (pet ? 10 : 0));
        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.fillRect(hx + 23, ground - 1, 18, 2);
        if (petImg && pet) {
          const a = PET_ART[pet];
          const fi = still ? (a.idle ?? a.walk[0]) : a.walk[Math.floor(t / a.ms) % a.walk.length];
          const px = a.fly ? hx + 4 : hx - a.w + (a.w > 40 ? 22 : 16);
          const py = a.fly ? ground - 66 + Math.round(Math.sin(t / 260) * 2) : ground - a.foot;
          if (!a.fly) { const sw = Math.max(6, Math.round(a.w * 0.5)); g.fillRect(Math.round(px + a.w / 2 - sw / 2), ground - 1, sw, 2); }
          g.drawImage(petImg, fi * a.w, 0, a.w, a.h, px, py, a.w, a.h);
        }
        g.drawImage(hero, frame * 64, 0, 64, 64, hx, ground - 62, 64, 64);
        if (!still && visible) raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
      const io = new IntersectionObserver(([e]) => {
        const was = visible; visible = e.isIntersecting;
        if (visible && !was && !still) raf = requestAnimationFrame(draw);
      });
      io.observe(c);
      cleanup = () => io.disconnect();
    });
    let cleanup = () => {};
    return () => { alive = false; cancelAnimationFrame(raf); cleanup(); };
  }, [key, zoom]);
  return <canvas ref={ref} class="stage" role="img" aria-label={label || 'Your hero'} />;
}
