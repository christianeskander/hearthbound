import { completeTodo, keepDaily, tapHabit, type KeepResult } from '../engine/rules';
import { BOSSES, MATERIALS } from '../engine/content';
import { TRACK, rewardText } from '../engine/season';
import type { Badge } from '../engine/achievements';
import type { Evolved } from '../engine/pets';
import type { Material, Oath } from '../engine/types';
import { act, fx, getSave, toast } from './store';
import { sfx } from './audio';
import { refreshBadge } from './badge';

/** The small extras every keep can bring: a badge, a season reward, a familiar growing up. */
export function extras(r: { badges?: Badge[]; tiers?: number[]; evolved?: Evolved | null; perfect?: boolean }, delay = 700) {
  const s = getSave();
  let d = delay;
  if (r.perfect) { setTimeout(() => toast(s?.mode === 'kid' ? 'Every star today! Hooray!' : 'Every daily kept today. A clean day.', 'good'), d); d += 500; }
  for (const b of r.badges || []) { setTimeout(() => { sfx.badge(); toast(`Badge: ${b.name}. ${b.text}`, 'good', false, 5200); }, d); d += 600; }
  for (const i of r.tiers || []) { const id = s?.season.id || ''; setTimeout(() => toast(`Season reward ${i + 1}/${TRACK.length}: ${rewardText(TRACK[i].reward, id)}`, 'good', false, 5200), d); d += 600; }
  if (r.evolved) { const ev = r.evolved; setTimeout(() => { sfx.evolve(); fx({ type: 'evolve', familiar: ev.familiar }); toast(`${ev.name} grew: now ${ev.stage.name}! ${ev.stage.text}`, 'good', false, 6500); }, d); }
}

export function after(r: KeepResult | false, title: string) {
  if (!r) return;
  const p = r.payout;
  const s = getSave();
  if (r.bossDown || r.levelsGained) sfx.level(); else if (p.bright) sfx.bright(); else if (s?.mode === 'kid') sfx.star(); else sfx.keep(p.combo);
  if (p.strike) setTimeout(() => sfx.hit(), 90);
  try { navigator.vibrate?.(12); } catch { /* not supported */ }
  fx({ type: 'keep', gold: p.gold, xp: p.xp, strike: p.strike, bright: p.bright, combo: p.combo, drop: p.drop, levels: r.levelsGained, bossDown: r.bossDown });
  if (s?.mode === 'kid') {
    toast(`${title}: +${p.gold} star${p.gold === 1 ? '' : 's'}!`, 'good', true);
  } else {
    const bits = [`+${p.gold} gold`, `+${p.xp} XP`];
    if (p.strike) bits.push(`${p.strike} damage`);
    if (p.drop) bits.push(`found ${MATERIALS[p.drop as Material].name.toLowerCase()} (forge)`);
    toast(`${p.bright ? 'Bright keep! ' : ''}${title}: ${bits.join(' · ')}${p.combo > 1 ? ` · combo x${p.combo}` : ''}`, 'good', true);
  }
  if (r.levelsGained && s?.mode !== 'kid') setTimeout(() => toast(`Level ${s?.hero.level}! You have a skill point to spend on the Hero page.`, 'good', false, 5200), 400);
  if (r.levelsGained && s?.mode === 'kid') setTimeout(() => toast(`${s.hero.name} grew to level ${s.hero.level}!`, 'good', false, 5200), 400);
  if (r.bossDown) setTimeout(() => { sfx.boss(); toast(`${BOSSES.find((b) => b.id === r.bossDown)!.name} is beaten. Rewards are in your pack.`, 'good', false, 6000); }, 600);
  for (const t of r.titles) setTimeout(() => toast(`New title: ${t}`, 'good'), 900);
  extras(r, 1100);
  refreshBadge();
}

export function keep(o: Oath) {
  if (o.kind === 'daily') after(act(`Keep "${o.title}"`, (s, now) => keepDaily(s, o.id, now), { undo: true }), o.title);
  else if (o.kind === 'todo') after(act(`Finish "${o.title}"`, (s, now) => completeTodo(s, o.id, now), { undo: true }), o.title);
  else after(act(`+ "${o.title}"`, (s, now) => tapHabit(s, o.id, 1, now) as KeepResult, { undo: true }), o.title);
}

export function slip(o: Oath) {
  const r = act(`− "${o.title}"`, (s, now) => tapHabit(s, o.id, -1, now) as { hurt: number; fell: boolean }, { undo: true });
  if (!r) return;
  sfx.hurt();
  fx({ type: 'hurt', hp: r.hurt });
  if (r.hurt === 0) toast('Noted, with no cost. Gentle mode is on.', 'info', true);
  else toast(r.fell ? 'That one knocked you down. You are back at the hearth, rested.' : `Noted. −${r.hurt} vitality. It happens; the next + counts.`, 'bad', true);
}
