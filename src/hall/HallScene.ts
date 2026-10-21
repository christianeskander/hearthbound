import * as Phaser from 'phaser';
import { ALL_LAYER_KEYS, PLACES, STRIDE_PX, VIEW_H, WALK_MS } from './layers';
import { BOSS_ART, PET_ART } from '../art/look';
import type { Phase } from '../engine/phase';

// Day and night: a multiply wash over the backdrop (and a lighter one over the
// characters at night), stars in the sky, and a warm lantern glow around the hero.
const WASH: Record<Phase, { bg: number; fg: number; stars: number; glow: number }> = {
  dawn: { bg: 0xffd9c8, fg: 0xfff0e8, stars: 0, glow: 0 },
  day: { bg: 0xffffff, fg: 0xffffff, stars: 0, glow: 0 },
  dusk: { bg: 0xf4b48c, fg: 0xffe2cc, stars: 0.35, glow: 0.18 },
  night: { bg: 0x5c6cae, fg: 0xa9b4e0, stars: 1, glow: 0.32 },
};

const SPEED = STRIDE_PX / (8 * WALK_MS); // px per ms

export interface HallEvents {
  tapHero(): void;
  tapPet(): void;
  float(text: string, x: number, y: number, kind: string): void;
  ready(): void;
}

export class HallScene extends Phaser.Scene {
  W = 195;
  private t = 0;
  private dist = 0;
  private paused = 0; // ms left of a stand-still
  private tiles: Phaser.GameObjects.TileSprite[] = [];
  private place = 'inn';
  private hero!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Ellipse;
  private pet: Phaser.GameObjects.Sprite | null = null;
  private petId = '';
  private petHop = 0;
  private petShadow!: Phaser.GameObjects.Ellipse;
  private boss: Phaser.GameObjects.Sprite | null = null;
  private bossId: string | null = null;
  private bossFlash = 0;
  private bossDying = -1;
  private heroKey = '';
  private heroSerial = 0;
  private pendingHero: HTMLCanvasElement | null = null;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private phase: Phase = 'day';
  private washBg: Phaser.GameObjects.Rectangle | null = null;
  private washFg: Phaser.GameObjects.Rectangle | null = null;
  private glow: Phaser.GameObjects.Image | null = null;
  private stars: { g: Phaser.GameObjects.Rectangle; p: number }[] = [];
  private petScale = 1;
  private petAura = 0; // 0 none, 1 bonded (warm), 2 elder (gold + motes)
  private auraG: Phaser.GameObjects.Ellipse | null = null;
  private motes!: Phaser.GameObjects.Particles.ParticleEmitter;
  private moteT = 0;
  events2: HallEvents;
  reduced = false;

  constructor(ev: HallEvents) { super('hall'); this.events2 = ev; }

  preload() {
    const base = import.meta.env.BASE_URL + 'assets/';
    for (const k of ALL_LAYER_KEYS) this.load.image('bg:' + k, base + 'bg/' + k + '.png');
    for (const [id, a] of Object.entries(PET_ART)) this.load.spritesheet('pet:' + id, base + a.file, { frameWidth: a.w, frameHeight: a.h });
    for (const [id, a] of Object.entries(BOSS_ART)) this.load.spritesheet('boss:' + id, base + a.file, { frameWidth: a.w, frameHeight: a.h });
  }

  create() {
    this.makeCoin();
    this.heroShadow = this.add.ellipse(0, 0, 18, 4, 0x000000, 0.28).setDepth(9);
    this.petShadow = this.add.ellipse(0, 0, 14, 3, 0x000000, 0.25).setDepth(7).setVisible(false);
    this.hero = this.add.sprite(0, 0, '__DEFAULT').setOrigin(0, 0).setDepth(10).setVisible(false);
    this.hero.setInteractive({ pixelPerfect: false, hitArea: new Phaser.Geom.Rectangle(16, 10, 32, 54), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.hero.on('pointerdown', () => { this.paused = 1800; this.events2.tapHero(); });
    this.emitter = this.add.particles(0, 0, 'coin', {
      speed: { min: 30, max: 70 }, angle: { min: 235, max: 305 }, gravityY: 160, lifespan: 700, quantity: 0, scale: 1,
      alpha: { start: 1, end: 0.2 }, emitting: false,
    }).setDepth(20);
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 20, max: 60 }, lifespan: 380, quantity: 0, alpha: { start: 1, end: 0 }, emitting: false, blendMode: 'ADD',
    }).setDepth(21);
    this.motes = this.add.particles(0, 0, 'spark', {
      speed: { min: 4, max: 14 }, angle: { min: 250, max: 290 }, lifespan: 900, quantity: 0, alpha: { start: 0.9, end: 0 }, tint: 0xffe28a, emitting: false, blendMode: 'ADD',
    }).setDepth(13);
    this.setPlace(this.place, true);
    if (this.pendingHero) { this.applyHero(this.pendingHero); this.pendingHero = null; }
    if (this.petId) this.setPet(this.petId, true);
    if (this.bossId) this.setBoss(this.bossId, true);
    this.events2.ready();
  }

  private makeCoin() {
    // a 5x5 coin and a 3x3 spark, drawn here (no external art)
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x7a4b10).fillRect(1, 0, 3, 5).fillRect(0, 1, 5, 3);
    g.fillStyle(0xf3c64a).fillRect(1, 1, 3, 3);
    g.fillStyle(0xfff3b0).fillRect(1, 1, 1, 1);
    g.generateTexture('coin', 5, 5); g.clear();
    g.fillStyle(0xfff0c0).fillRect(1, 0, 1, 3).fillRect(0, 1, 3, 1);
    g.generateTexture('spark', 3, 3); g.destroy();
    // a soft round glow for the lantern light (drawn once, smooth on purpose)
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d')!, gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(0.45, 'rgba(255,160,80,0.45)'); gr.addColorStop(1, 'rgba(255,140,60,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    this.textures.addCanvas('glow', c);
  }

  get ground() { return PLACES[this.place].ground; }
  get heroX() { return Math.round(this.W * 0.42) - 32; }

  setPlace(id: string, force = false) {
    if (!PLACES[id]) id = 'inn';
    if (id === this.place && !force && this.tiles.length) return;
    this.place = id;
    if (!this.sys.isActive() && !force) return;
    for (const t of this.tiles) t.destroy();
    this.tiles = PLACES[id].layers.map((l, i) => this.add.tileSprite(0, 0, this.W, VIEW_H, 'bg:' + l.key).setOrigin(0, 0).setDepth(i - 20));
    this.buildSky();
    this.layout();
  }

  setPhase(p: Phase) {
    if (p === this.phase && this.washBg) return;
    this.phase = p;
    if (this.hero) this.buildSky();
  }

  private buildSky() {
    this.washBg?.destroy(); this.washFg?.destroy(); this.glow?.destroy();
    for (const s of this.stars) s.g.destroy();
    this.stars = [];
    const w = WASH[this.phase];
    // the wash sits on top of every backdrop layer but under the characters
    this.washBg = this.add.rectangle(0, 0, this.W, VIEW_H, w.bg).setOrigin(0, 0).setDepth(-1).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(w.bg !== 0xffffff);
    this.washFg = this.add.rectangle(0, 0, this.W, VIEW_H, w.fg).setOrigin(0, 0).setDepth(30).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(w.fg !== 0xffffff);
    if (w.stars > 0) {
      // stars just above the farthest layer, so hills and trees cover them
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const n = Math.round((this.W / 6) * w.stars);
      for (let i = 0; i < n; i++) {
        const big = rnd() < 0.12;
        const g = this.add.rectangle(Math.floor(rnd() * this.W), 2 + Math.floor(rnd() * 46), big ? 2 : 1, big ? 2 : 1, big ? 0xfff6d8 : 0xdfe6ff).setOrigin(0, 0).setDepth(-0.5);
        this.stars.push({ g, p: rnd() * 6.28 });
      }
    }
    if (w.glow > 0) this.glow = this.add.image(0, 0, 'glow').setDisplaySize(120, 84).setAlpha(w.glow).setDepth(31).setBlendMode(Phaser.BlendModes.ADD);
    this.layout();
  }

  setPetStage(scale: number, aura: number) {
    this.petScale = scale; this.petAura = aura;
    if (this.pet) this.pet.setScale(scale);
    this.auraG?.destroy(); this.auraG = null;
    if (aura > 0 && this.hero) this.auraG = this.add.ellipse(0, 0, 30, 14, aura > 1 ? 0xffd860 : 0xff9a70, aura > 1 ? 0.32 : 0.2).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** The familiar grew up: a burst of light. */
  evolveFx() {
    if (!this.pet || this.reduced) return;
    const c = this.pet.getCenter();
    this.sparks.explode(24, c.x, c.y);
    this.motes.explode(16, c.x, c.y);
    this.petHop = 420;
  }

  resize(W: number) {
    this.W = W;
    for (const t of this.tiles) t.setSize(W, VIEW_H);
    this.layout();
  }

  private layout() {
    if (!this.hero) return;
    const gy = this.ground;
    this.hero.setPosition(this.heroX, gy - 62);
    this.heroShadow.setPosition(this.heroX + 31, gy);
    this.washBg?.setSize(this.W, VIEW_H); this.washFg?.setSize(this.W, VIEW_H);
    this.glow?.setPosition(this.heroX + 32, gy - 26);
    if (this.boss && this.bossId) this.placeBoss();
  }

  setHero(strip: HTMLCanvasElement) {
    if (!this.hero) { this.pendingHero = strip; return; }
    this.applyHero(strip);
  }

  private applyHero(strip: HTMLCanvasElement) {
    const key = 'hero' + ++this.heroSerial;
    const tex = this.textures.addCanvas(key, strip)!;
    for (let i = 0; i < 10; i++) tex.add(i, 0, i * 64, 0, 64, 64);
    const old = this.heroKey;
    this.hero.setTexture(key, 1).setVisible(true);
    this.heroKey = key;
    if (old) this.textures.remove(old);
    this.layout();
  }

  setPet(id: string, force = false) {
    if (id === this.petId && this.pet && !force) return;
    this.petId = id;
    if (!this.hero) return;
    this.pet?.destroy();
    const a = PET_ART[id];
    if (!a) { this.pet = null; return; }
    this.pet = this.add.sprite(0, 0, 'pet:' + id, a.walk[0]).setOrigin(0, 0).setDepth(a.fly ? 12 : 8).setScale(this.petScale);
    if (this.petAura && !this.auraG) this.setPetStage(this.petScale, this.petAura);
    this.pet.setInteractive({ useHandCursor: true });
    this.pet.on('pointerdown', () => { this.petHop = 420; this.events2.tapPet(); });
    this.petShadow.setVisible(true).setSize(Math.max(6, Math.round(a.w * 0.5)), 3);
  }

  setBoss(id: string | null, force = false) {
    if (id === this.bossId && !force) return;
    this.bossId = id;
    if (!this.hero) return;
    if (!id) { if (this.boss && this.bossDying < 0) { this.boss.destroy(); this.boss = null; } return; }
    this.boss?.destroy();
    this.bossDying = -1;
    if (!BOSS_ART[id]) { this.boss = null; return; }
    this.boss = this.add.sprite(0, 0, 'boss:' + id, BOSS_ART[id].walk[0]).setOrigin(0, 0).setDepth(9).setAlpha(1).setScale(1);
    this.placeBoss();
  }

  private placeBoss() {
    if (!this.boss || !this.bossId) return;
    const a = BOSS_ART[this.bossId];
    if (!a) return;
    const s = this.boss.scaleX;
    this.boss.setPosition(this.W - Math.round(a.w * s) - 6, this.ground - Math.round(a.foot * s) + (a.dy || 0));
  }

  /** A keep: coins from the hero, and a strike on the foe if there is one. */
  keepFx(gold: number, strike: number, bright: boolean) {
    if (this.reduced) return;
    const hx = this.heroX + 32, hy = this.ground - 48;
    this.emitter.explode(Math.min(14, 3 + gold * (bright ? 2 : 1)), hx, hy);
    if (strike && this.boss) {
      const bx = this.boss.x + this.boss.displayWidth / 2, by = this.boss.y + this.boss.displayHeight / 2;
      this.time.delayedCall(180, () => {
        this.sparks.explode(10, bx, by);
        this.bossFlash = 160;
        this.events2.float(`−${strike}`, bx, by - 14, 'strike');
      });
    }
  }

  hurtFx() {
    if (this.reduced) return;
    this.cameras.main.shake(180, 0.004);
    this.hero.setTintFill(0xff6060);
    this.time.delayedCall(120, () => this.hero.clearTint());
  }

  bossDown() {
    if (!this.boss || !this.bossId) return;
    this.bossDying = 0;
  }

  heroAnchor() { return { x: this.heroX + 32, y: this.ground - 50 }; }

  update(_t: number, dtRaw: number) {
    const dt = Math.min(dtRaw, 50);
    this.t += dt;
    const walking = this.paused <= 0 && !this.reduced;
    if (this.paused > 0) this.paused -= dt;
    if (walking) this.dist += dt * SPEED;
    // background: integer pixel offsets only, so nothing shimmers
    const pl = PLACES[this.place];
    this.tiles.forEach((ts, i) => {
      const l = pl.layers[i];
      ts.tilePositionX = Math.floor(this.dist * l.f + (l.drift ? this.t * l.drift / 1000 : 0));
    });
    // hero: frame from the same clock as the ground
    if (this.heroKey) {
      const f = walking ? 1 + (Math.floor(this.t / WALK_MS) % 8) : 0;
      if (this.hero.frame.name !== String(f)) this.hero.setFrame(f);
    }
    // familiar
    if (this.pet) {
      const a = PET_ART[this.petId];
      const fi = walking ? a.walk[Math.floor(this.t / a.ms) % a.walk.length] : a.fly ? a.walk[Math.floor(this.t / (a.ms * 2)) % a.walk.length] : (a.idle ?? a.walk[0]);
      if (this.pet.frame.name !== String(fi)) this.pet.setFrame(fi);
      let hop = 0;
      if (this.petHop > 0) { this.petHop -= dt; const p = 1 - this.petHop / 420; hop = Math.round(Math.sin(Math.PI * Math.min(1, p)) * 9); }
      const sc = this.petScale;
      const px = a.fly ? this.heroX + 4 : this.heroX - Math.round(a.w * sc) + (a.w > 40 ? 22 : 16);
      const py = a.fly ? this.ground - 66 + Math.round(Math.sin(this.t / 260) * 2) : this.ground - Math.round(a.foot * sc);
      this.pet.setPosition(px, py - hop);
      if (this.auraG) {
        this.auraG.setPosition(px + (a.w * sc) / 2, a.fly ? py + a.h * sc * 0.6 : this.ground - 3);
        this.auraG.setAlpha((this.petAura > 1 ? 0.3 : 0.18) + Math.sin(this.t / 400) * 0.06);
        if (this.petAura > 1 && !this.reduced && (this.moteT -= dt) <= 0) { this.moteT = 520; this.motes.explode(1, px + Math.random() * a.w * sc, py + Math.random() * a.h * sc * 0.6); }
      }
      this.petShadow.setPosition(px + a.w / 2 + (a.fly ? 0 : 0), this.ground + (a.fly ? 0 : 0)).setAlpha(a.fly ? 0.12 : 0.25);
    }
    // stars twinkle
    if (this.stars.length && !this.reduced) for (const s of this.stars) s.g.setAlpha(0.55 + 0.45 * Math.sin(this.t / 700 + s.p));
    // foe
    if (this.boss && this.bossId) {
      const a = BOSS_ART[this.bossId];
      if (this.bossDying >= 0) {
        this.bossDying += dt;
        if (a.death.length) this.boss.setFrame(a.death[Math.min(a.death.length - 1, Math.floor(this.bossDying / a.deathMs))]);
        else { // no death frames: it wilts
          const p = Math.min(1, this.bossDying / 900);
          this.boss.setScale(1, 1 - 0.55 * p);
          this.boss.y = this.ground - Math.round(a.foot * (1 - 0.55 * p)) + (a.dy || 0);
        }
        if (this.bossDying > 1100) { this.boss.setAlpha(Math.max(0, 1 - (this.bossDying - 1100) / 500)); }
        if (this.bossDying > 1600) { this.boss.destroy(); this.boss = null; this.bossDying = -1; this.bossId = null; }
      } else {
        const f = a.walk[Math.floor(this.t / a.ms) % a.walk.length];
        if (this.boss.frame.name !== String(f)) this.boss.setFrame(f);
        if (this.bossFlash > 0) { this.bossFlash -= dt; this.boss.setTintFill(0xffffff); } else this.boss.clearTint();
      }
    }
  }
}
