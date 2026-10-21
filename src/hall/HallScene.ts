import * as Phaser from 'phaser';
import { ALL_LAYER_KEYS, PLACES, STRIDE_PX, VIEW_H, WALK_MS } from './layers';
import { BOSS_ART, PET_ART } from '../art/look';

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
    this.layout();
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
    this.pet = this.add.sprite(0, 0, 'pet:' + id, a.walk[0]).setOrigin(0, 0).setDepth(a.fly ? 12 : 8);
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
    this.boss = this.add.sprite(0, 0, 'boss:' + id, 0).setOrigin(0, 0).setDepth(9);
    this.placeBoss();
  }

  private placeBoss() {
    if (!this.boss || !this.bossId) return;
    const a = BOSS_ART[this.bossId];
    const s = this.boss.scaleX;
    this.boss.setPosition(this.W - Math.round(a.w * s) - 6, this.ground - Math.round(a.foot * s) + (this.bossId === 'slime' ? 0 : 2));
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
      const px = a.fly ? this.heroX + 4 : this.heroX - a.w + (a.w > 40 ? 22 : 16);
      const py = a.fly ? this.ground - 66 + Math.round(Math.sin(this.t / 260) * 2) : this.ground - a.foot;
      this.pet.setPosition(px, py - hop);
      this.petShadow.setPosition(px + a.w / 2 + (a.fly ? 0 : 0), this.ground + (a.fly ? 0 : 0)).setAlpha(a.fly ? 0.12 : 0.25);
    }
    // foe
    if (this.boss && this.bossId) {
      const a = BOSS_ART[this.bossId];
      if (this.bossDying >= 0) {
        this.bossDying += dt;
        const f = this.bossId === 'slime' ? a.row.death * 10 + Math.min(9, Math.floor(this.bossDying / 90)) : 8 + Math.min(3, Math.floor(this.bossDying / 140));
        this.boss.setFrame(f);
        if (this.bossDying > 1100) { this.boss.setAlpha(Math.max(0, 1 - (this.bossDying - 1100) / 500)); }
        if (this.bossDying > 1600) { this.boss.destroy(); this.boss = null; this.bossDying = -1; this.bossId = null; }
      } else {
        const f = this.bossId === 'slime' ? a.row.walk * 10 + (Math.floor(this.t / a.ms) % 10) : a.walk[Math.floor(this.t / a.ms) % 4];
        if (this.boss.frame.name !== String(f)) this.boss.setFrame(f);
        if (this.bossFlash > 0) { this.bossFlash -= dt; this.boss.setTintFill(0xffffff); } else this.boss.clearTint();
      }
    }
  }
}
