let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(f: number, at: number, dur: number, type: OscillatorType, vol: number) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, a.currentTime + at);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + at + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + at); o.stop(a.currentTime + at + dur + 0.02);
}
export const sfx = {
  keep(combo = 1) { const b = 660 * Math.pow(1.06, Math.min(combo, 8) - 1); tone(b, 0, 0.12, 'triangle', 0.12); tone(b * 1.5, 0.07, 0.18, 'triangle', 0.1); },
  bright() { tone(880, 0, 0.1, 'square', 0.05); tone(1320, 0.06, 0.1, 'square', 0.05); tone(1760, 0.12, 0.2, 'triangle', 0.08); },
  hurt() { tone(160, 0, 0.18, 'sawtooth', 0.06); },
  level() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.1)); },
  boss() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.3, 'triangle', 0.1)); },
};
