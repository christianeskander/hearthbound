import { useState } from 'preact/hooks';
import { canClaim, currentChapter, goalStates, isOpen } from '../engine/story';
import { GRADE_INFO, lastWeekOf, weekReport } from '../engine/report';
import { addPause, endPause, isPaused, MAX_PAUSE_DAYS } from '../engine/pause';
import { addOath, today } from '../engine/rules';
import { addDays, dowOf } from '../engine/time';
import type { Pause, Save } from '../engine/types';
import { act, goTab, openSheet, toast } from './store';
import { keep } from './actions';
import { Icon } from './icons';
import { Sheet } from './Sheet';
import { claim, setJourneySeg } from './Journey';

export function StoryCard({ s }: { s: Save }) {
  const c = currentChapter(s);
  if (!c) return null;
  const open = isOpen(s, c);
  const ready = canClaim(s);
  const gs = open ? goalStates(s, c) : [];
  const g = gs.find((x) => !x.done);
  const go = () => { setJourneySeg('story'); goTab('journey'); };
  return (
    <div class={`card story-card ${ready ? 'ready' : ''}`}>
      <div class="kicker">Story · chapter {c.n} <button class="link small" onClick={go}>Read</button></div>
      <b>{c.title}</b>
      {!open && <p class="dim small">Opens at level {c.level}.</p>}
      {open && !ready && g && (
        <div class="goal-line"><span>{g.text}</span><span class="gn">{g.have}/{g.need}</span></div>
      )}
      {open && !ready && g && <div class="bar thin"><i style={{ width: `${(100 * g.have) / g.need}%` }} /></div>}
      {ready && <><p class="good small">Chapter complete.</p><button class="primary wide" onClick={claim}>Claim the reward</button></>}
    </div>
  );
}

export function WeekCard({ s }: { s: Save }) {
  const d = today(s, Date.now());
  const last = lastWeekOf(d);
  if (s.reportSeen === last) return null;
  const r = weekReport(s, last);
  if (r.empty) return null;
  const gi = GRADE_INFO[r.grade];
  return (
    <div class="card week-card">
      <div class="kicker">Last week's report card</div>
      <div class="wc-row">
        <div class="flames" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <span key={i} class={i < gi.flames ? 'on' : ''}><Icon name="flame" size={16} /></span>)}</div>
        <b>{gi.name}</b>
        <span class="dim small">{r.due ? `${r.kept}/${r.due} dailies` : `${r.keeps} keeps`}</span>
      </div>
      <p class="small">{r.message}</p>
      <div class="row end">
        <button class="ghost small" onClick={() => act('Report seen', (x) => { x.reportSeen = last; })}>Later</button>
        <button class="secondary small" onClick={() => { setJourneySeg('week'); goTab('journey'); }}>See the week</button>
      </div>
    </div>
  );
}

/** Gentle mode: tiny one-tap wins, plus "I did something else". */
export function TinyCard({ s }: { s: Save }) {
  const [other, setOther] = useState('');
  const chips = s.oaths.filter((o) => o.kind === 'habit' && o.up);
  const d = today(s, Date.now());
  const wins = s.history[d]?.keeps ?? 0;
  const addOther = (e: Event) => {
    e.preventDefault();
    const t = other.trim();
    if (!t) return;
    let o = s.oaths.find((x) => x.kind === 'habit' && x.up && x.title.toLowerCase() === t.toLowerCase());
    if (!o) {
      const r = act('Tiny win', (x, n) => { const h = addOath(x, { kind: 'habit', title: t.slice(0, 80), difficulty: 'trivial', stat: 'grit', up: true, down: false }, n); h.icon = '✨'; return h; });
      if (!r) return;
      o = r;
    }
    keep(o);
    setOther('');
  };
  return (
    <div class="card tiny">
      <div class="kicker">Tiny wins <span class="count">{wins} today</span></div>
      <p class="dim small">Tap whatever happened. No plan needed, nothing to keep up with, and nothing is ever lost.</p>
      <div class="chips">
        {chips.map((o) => (
          <button key={o.id} class="win" onClick={() => keep(o)} aria-label={`I did it: ${o.title}`}>
            <span class="wi" aria-hidden="true">{o.icon || '✨'}</span><span>{o.title}</span>{o.ups > 0 && <em>×{o.ups}</em>}
          </button>
        ))}
      </div>
      <form class="other" onSubmit={addOther}>
        <input value={other} maxLength={80} placeholder="Something else I did…" onInput={(e) => setOther((e.target as HTMLInputElement).value)} aria-label="Something else I did" />
        <button class="secondary" type="submit" disabled={!other.trim()}>Count it</button>
      </form>
    </div>
  );
}

const WHY: { id: Pause['why']; label: string }[] = [{ id: 'sick', label: 'Sick' }, { id: 'away', label: 'Away' }, { id: 'rest', label: 'Day off' }];
export function RestSheet({ s, onClose }: { s: Save; onClose: () => void }) {
  const d = today(s, Date.now());
  const [why, setWhy] = useState<Pause['why']>('sick');
  const [from, setFrom] = useState(d);
  const [to, setTo] = useState(d);
  const sunday = addDays(d, (7 - dowOf(d)) % 7);
  const quick = [{ l: 'Today', t: d }, { l: 'Today and tomorrow', t: addDays(d, 1) }, { l: 'Until Sunday', t: sunday }, { l: 'A week', t: addDays(d, 6) }];
  const save = (f: string, t: string) => {
    const r = act('Rest days', (x) => addPause(x, f, t, why, d), { undo: true });
    if (r) { toast(`Rest ${r.from === r.to ? 'day' : 'days'} set. Streaks, vitality and foes are frozen ${r.from === r.to ? 'that day' : 'those days'}. Keeps still count.`, 'good', true, 6000); onClose(); }
  };
  const upcoming = s.pauses.filter((p) => p.to >= d);
  return (
    <Sheet title="Rest days" onClose={onClose}>
      <p class="hint">Sick, travelling, or just need a break? On a rest day nothing is missed: no vitality lost, no streak broken, no foe bites. Up to {MAX_PAUSE_DAYS} days at a time. Anything you do keep still pays.</p>
      <div class="pills">{WHY.map((w) => <button key={w.id} class={why === w.id ? 'pill on' : 'pill'} aria-pressed={why === w.id} onClick={() => setWhy(w.id)}>{w.label}</button>)}</div>
      <div class="quick">{quick.map((q) => <button key={q.l} class="secondary" onClick={() => save(d, q.t)}>{q.l}</button>)}</div>
      <details class="custom"><summary>Pick dates</summary>
        <div class="dates">
          <label>From<input type="date" min={d} value={from} onInput={(e) => setFrom((e.target as HTMLInputElement).value)} /></label>
          <label>To<input type="date" min={from} value={to} onInput={(e) => setTo((e.target as HTMLInputElement).value)} /></label>
        </div>
        <button class="primary wide" onClick={() => save(from, to)}>Set rest days</button>
      </details>
      {upcoming.length > 0 && (
        <>
          <h3>Planned</h3>
          {upcoming.map((p) => (
            <div class="li" key={p.from}>
              <span class="t">{p.why === 'sick' ? 'Sick' : p.why === 'away' ? 'Away' : 'Day off'}: {p.from === p.to ? p.from : `${p.from} to ${p.to}`}</span>
              <button class="ghost small" onClick={() => act('End rest', (x) => endPause(x, p.from, d))}>{p.from > d ? 'Cancel' : 'End now'}</button>
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}
export const restingToday = (s: Save) => isPaused(s, today(s, Date.now()));
export { openSheet };
