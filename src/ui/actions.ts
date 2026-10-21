import { completeTodo, keepDaily, tapHabit, type KeepResult } from '../engine/rules';
import { BOSSES, MATERIALS } from '../engine/content';
import type { Material, Oath } from '../engine/types';
import { act, fx, getSave, toast } from './store';
import { sfx } from './sound';

function after(r: KeepResult | false, title: string) {
  if (!r) return;
  const p = r.payout;
  const s = getSave();
  if (s?.settings.sound) { if (r.bossDown || r.levelsGained) sfx.level(); else if (p.bright) sfx.bright(); else sfx.keep(p.combo); }
  try { navigator.vibrate?.(12); } catch { /* not supported */ }
  fx({ type: 'keep', gold: p.gold, xp: p.xp, strike: p.strike, bright: p.bright, combo: p.combo, drop: p.drop, levels: r.levelsGained, bossDown: r.bossDown });
  const bits = [`+${p.gold} gold`, `+${p.xp} XP`];
  if (p.strike) bits.push(`${p.strike} damage`);
  if (p.drop) bits.push(`found ${MATERIALS[p.drop as Material].name.toLowerCase()} (forge)`);
  toast(`${p.bright ? 'Bright keep! ' : ''}${title}: ${bits.join(' · ')}${p.combo > 1 ? ` · combo x${p.combo}` : ''}`, 'good', true);
  if (r.levelsGained) setTimeout(() => toast(`Level ${s?.hero.level}! You have a skill point to spend on the Hero page.`, 'good', false, 5200), 400);
  if (r.bossDown) setTimeout(() => toast(`${BOSSES.find((b) => b.id === r.bossDown)!.name} is beaten. Rewards are in your pack.`, 'good', false, 6000), 600);
  for (const t of r.titles) setTimeout(() => toast(`New title: ${t}`, 'good'), 900);
}

export function keep(o: Oath) {
  if (o.kind === 'daily') after(act(`Keep "${o.title}"`, (s, now) => keepDaily(s, o.id, now), { undo: true }), o.title);
  else if (o.kind === 'todo') after(act(`Finish "${o.title}"`, (s, now) => completeTodo(s, o.id, now), { undo: true }), o.title);
  else after(act(`+ "${o.title}"`, (s, now) => tapHabit(s, o.id, 1, now) as KeepResult, { undo: true }), o.title);
}

export function slip(o: Oath) {
  const r = act(`− "${o.title}"`, (s, now) => tapHabit(s, o.id, -1, now) as { hurt: number; fell: boolean }, { undo: true });
  if (!r) return;
  if (getSave()?.settings.sound) sfx.hurt();
  fx({ type: 'hurt', hp: r.hurt });
  toast(r.fell ? 'That one knocked you down. You are back at the hearth, rested.' : `Noted. −${r.hurt} vitality. It happens; the next + counts.`, 'bad', true);
}
