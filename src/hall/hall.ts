import * as Phaser from 'phaser';
import { HallScene, type HallEvents } from './HallScene';
import { VIEW_H } from './layers';

export interface Hall {
  scene: HallScene;
  scale: number; // CSS px per scene px
  setWidth(cssW: number): void;
  sleep(b: boolean): void;
  destroy(): void;
}

/** Integer device-pixel scaling: each scene pixel is exactly k device pixels. */
export function createHall(parent: HTMLElement, cssW: number, ev: HallEvents): Hall {
  const dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
  const k = Math.max(1, Math.round(2 * dpr));
  const cssPerPx = k / dpr;
  let W = Math.ceil(cssW / cssPerPx);
  const scene = new HallScene(ev);
  scene.W = W;
  scene.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W * k,
    height: VIEW_H * k,
    pixelArt: true,
    roundPixels: true,
    transparent: false,
    backgroundColor: '#14100e',
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.NONE },
    input: { touch: true, mouse: true },
    fps: { target: 60, smoothStep: false },
    scene,
    callbacks: {
      postBoot: (g) => {
        const cam = g.scene.getScene('hall').cameras.main;
        cam.setOrigin(0, 0).setZoom(k);
        styleCanvas(g.canvas);
      },
    },
  });
  function styleCanvas(c: HTMLCanvasElement) {
    c.style.width = (W * k) / dpr + 'px';
    c.style.height = (VIEW_H * k) / dpr + 'px';
    c.style.imageRendering = 'pixelated';
    c.style.display = 'block';
  }
  return {
    scene,
    scale: cssPerPx,
    setWidth(cssW2: number) {
      if (!(cssW2 > 50)) return;
      const W2 = Math.ceil(cssW2 / cssPerPx);
      if (W2 === W) return;
      W = W2;
      game.scale.resize(W * k, VIEW_H * k);
      scene.cameras?.main?.setOrigin(0, 0).setZoom(k);
      scene.resize(W);
      styleCanvas(game.canvas);
    },
    sleep(b) { if (b) game.loop.sleep(); else game.loop.wake(); },
    destroy() { game.destroy(true); },
  };
}
