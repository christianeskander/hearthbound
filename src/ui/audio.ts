// All sound is synthesized with WebAudio at run time: no audio files, nothing to
// license. Music is a slow generative pad plus music-box notes; it never starts
// until the first tap (browsers require that anyway) and pauses when hidden.
import { getPrefs, onPrefs } from './prefs';

let ctx: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode;
let unlocked = false;

function ac(): AudioContext | null {
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp).connect(ctx.destination);
    applyLevels();
  }
  if (ctx.state === 'suspended' && unlocked && document.visibilityState === 'visible') ctx.resume().catch(() => {});
  return ctx;
}
function applyLevels() {
  if (!ctx) return;
  const p = getPrefs(), t = ctx.currentTime;
  master.gain.setTargetAtTime(p.muted ? 0 : 1, t, 0.05);
  sfxBus.gain.setTargetAtTime(p.sfx * 0.9, t, 0.05);
  musicBus.gain.setTargetAtTime(p.musicOn ? p.music * 0.5 : 0, t, 0.4);
}
onPrefs(() => { applyLevels(); syncMusic(); });

function tone(f: number, at: number, dur: number, type: OscillatorType, vol: number, bus?: AudioNode, glide?: number) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, a.currentTime + at);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, a.currentTime + at + dur);
  g.gain.setValueAtTime(0, a.currentTime + at);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(bus || sfxBus);
  o.start(a.currentTime + at); o.stop(a.currentTime + at + dur + 0.05);
}
function noise(at: number, dur: number, vol: number, freq = 1200) {
  const a = ac(); if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate); const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(sfxBus); src.start(a.currentTime + at);
}
const ok = () => !getPrefs().muted && unlocked;

export const sfx = {
  keep(combo = 1) { if (!ok()) return; const b = 660 * Math.pow(1.06, Math.min(combo, 8) - 1); tone(b, 0, 0.12, 'triangle', 0.12); tone(b * 1.5, 0.07, 0.18, 'triangle', 0.1); },
  bright() { if (!ok()) return; tone(880, 0, 0.1, 'square', 0.05); tone(1320, 0.06, 0.1, 'square', 0.05); tone(1760, 0.12, 0.2, 'triangle', 0.08); },
  hurt() { if (!ok()) return; tone(180, 0, 0.2, 'sawtooth', 0.06, undefined, 110); },
  level() { if (!ok()) return; [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.1)); },
  boss() { if (!ok()) return; [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.32, 'triangle', 0.1)); noise(0, 0.25, 0.08, 500); },
  hit() { if (!ok()) return; noise(0, 0.08, 0.12, 1800); tone(220, 0, 0.1, 'square', 0.04, undefined, 120); },
  coin() { if (!ok()) return; tone(1568, 0, 0.07, 'square', 0.035); tone(2093, 0.05, 0.14, 'square', 0.035); },
  tap() { if (!ok()) return; tone(520, 0, 0.05, 'triangle', 0.06); },
  badge() { if (!ok()) return; [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.3, 'sine', 0.08)); },
  evolve() { if (!ok()) return; [392, 494, 587, 784, 988].forEach((f, i) => tone(f, i * 0.11, 0.5, 'sine', 0.07)); tone(1568, 0.6, 0.8, 'triangle', 0.05); },
  purr() { if (!ok()) return; for (let i = 0; i < 4; i++) noise(i * 0.11, 0.09, 0.05, 220); },
  star() { if (!ok()) return; [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.25, 'sine', 0.08)); },
};

// ------------------------------------------------------------ music
const SCALE = [0, 2, 4, 7, 9]; // major pentatonic: nothing can sound wrong
const CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]; // I vi IV V (semitones from root)
const ROOT = 57; // A3
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
let timer: number | null = null, next = 0, bar = 0;
function schedule() {
  const a = ac(); if (!a) return;
  while (next < a.currentTime + 1.2) {
    const chord = CHORDS[bar % CHORDS.length];
    const len = 4.8;
    for (const n of chord) { // soft pad
      const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
      o.type = 'triangle'; o.frequency.value = hz(ROOT + n);
      f.type = 'lowpass'; f.frequency.value = 700;
      g.gain.setValueAtTime(0, next); g.gain.linearRampToValueAtTime(0.05, next + 1.4); g.gain.linearRampToValueAtTime(0.0001, next + len + 0.8);
      o.connect(f).connect(g).connect(musicBus); o.start(next); o.stop(next + len + 1);
    }
    for (let i = 0; i < 8; i++) { // music-box notes, sparse
      if (Math.random() < 0.45) continue;
      const deg = SCALE[Math.floor(Math.random() * SCALE.length)] + 12 * (1 + Math.floor(Math.random() * 2));
      const t = next + i * 0.6;
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = hz(ROOT + deg);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g).connect(musicBus); o.start(t); o.stop(t + 1.7);
    }
    next += len; bar++;
  }
}
function syncMusic() {
  const p = getPrefs();
  const want = unlocked && p.musicOn && !p.muted && document.visibilityState === 'visible';
  if (want && timer === null) { const a = ac(); if (!a) return; next = Math.max(next, a.currentTime + 0.1); schedule(); timer = window.setInterval(schedule, 400); }
  if (!want && timer !== null) { clearInterval(timer); timer = null; }
}

/** Call once at start-up. Nothing plays until the first tap. */
export function initAudio() {
  const unlock = () => {
    unlocked = true;
    const a = ac(); a?.resume().catch(() => {});
    syncMusic();
    window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend().catch(() => {}); else if (unlocked) ctx.resume().catch(() => {});
    syncMusic();
  });
}
