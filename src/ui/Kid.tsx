// The little-one view: big picture buttons, stars, a familiar that grows, and a
// reward shelf. No bars to fall, no penalties, nothing to read that matters.
import { useRef, useState } from 'preact/hooks';
import { addOath, addReward, buyReward, deleteOath, isDueOn, today } from '../engine/rules';
import { KID_PRESETS } from '../engine/save';
import { bondOf, nextStage, stageOf } from '../engine/pets';
import { familiarById } from '../engine/content';
import type { Save } from '../engine/types';
import { act, openSheet, toast } from './store';
import { keep } from './actions';
import { Sheet } from './Sheet';
import { sfx } from './audio';
import { refreshBadge } from './badge';
import { planReminders } from './reminders';

/** Press and hold (so a small hand cannot do it by accident). */
function useHold(ms: number, fn: () => void) {
  const t = useRef(0);
  const [on, setOn] = useState(false);
  const start = (e: Event) => { e.preventDefault(); setOn(true); t.current = window.setTimeout(() => { setOn(false); fn(); }, ms); };
  const stop = () => { setOn(false); clearTimeout(t.current); };
  return { on, props: { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop, onContextMenu: (e: Event) => e.preventDefault() } };
}

function Reward({ s, r }: { s: Save; r: Save['rewards'][number] }) {
  const can = s.hero.gold >= r.cost;
  const h = useHold(900, () => {
    if (act('Treat', (x, n) => buyReward(x, r.id, n)) !== false) { sfx.level(); toast(`Hooray! ${r.title}! Show a grown-up.`, 'good', false, 6000); }
  });
  const [emoji, ...rest] = [...r.title];
  const isEmoji = /\p{Extended_Pictographic}/u.test(emoji || '');
  return (
    <button class={`kid-reward ${can ? 'can' : ''} ${h.on ? 'holding' : ''}`} disabled={!can} {...h.props} aria-label={`${r.title}, ${r.cost} stars${can ? '. Press and hold to get it' : ''}`}>
      <span class="ke" aria-hidden="true">{isEmoji ? emoji : '🎁'}</span>
      <span class="kt">{isEmoji ? rest.join('').trim() : r.title}</span>
      <span class="kc">⭐ {r.cost}</span>
      {can && <small>{h.on ? 'Keep holding…' : 'Hold to get it'}</small>}
    </button>
  );
}

export function KidView({ s, onGrownUp }: { s: Save; onGrownUp: () => void }) {
  const d = today(s, Date.now());
  const due = s.oaths.filter((o) => isDueOn(o, d));
  const left = due.filter((o) => o.doneDay !== d).length;
  const fam = familiarById(s.hero.familiar);
  const st = stageOf(s, s.hero.familiar), nx = nextStage(s, s.hero.familiar);
  const bond = bondOf(s, s.hero.familiar);
  const [menu, setMenu] = useState(false);
  const hold = useHold(1200, () => setMenu(true));
  return (
    <div class="kid">
      <div class="kid-head">
        <button class="kid-name" onClick={() => openSheet('family')} aria-label={`${s.hero.name}. Switch hero`}>{s.hero.name}</button>
        <span class="kid-stars" aria-label={`${s.hero.gold} stars`}>⭐ {s.hero.gold}</span>
      </div>
      <p class="kid-msg">{due.length === 0 ? 'A free day! Play and have fun.' : left === 0 ? 'You did them all! Amazing!' : left === 1 ? 'One more to go!' : `${left} to do today`}</p>
      <div class="kid-grid">
        {due.map((o) => {
          const done = o.doneDay === d;
          return (
            <button key={o.id} class={`kid-oath ${done ? 'done' : ''}`} disabled={done} aria-pressed={done} onClick={() => keep(o)} aria-label={done ? `${o.title}, done` : o.title}>
              <span class="ke" aria-hidden="true">{o.icon || '⭐'}</span>
              <span class="kt">{o.title}</span>
              {done && <span class="kd" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
      {fam && (
        <div class="kid-pet">
          <span class="kt">{fam.name} is <b>{st.name.toLowerCase()}</b></span>
          {nx ? <div class="kid-grow" aria-label={`${nx.at - bond} more to grow`}><i style={{ width: `${Math.min(100, (100 * (bond - st.at)) / (nx.at - st.at))}%` }} /></div> : <span>🌟 all grown up!</span>}
          {nx && <small>{nx.at - bond} more and {fam.name} grows!</small>}
        </div>
      )}
      <div class="kid-shelf">
        <h3>Treats</h3>
        <div class="kid-rewards">{s.rewards.map((r) => <Reward key={r.id} s={s} r={r} />)}</div>
      </div>
      <button class={`grownups ${hold.on ? 'holding' : ''}`} {...hold.props} aria-label="Grown-ups: press and hold">{hold.on ? 'Keep holding…' : 'Grown-ups (hold)'}</button>
      {menu && <GrownUps s={s} onClose={() => setMenu(false)} onFull={() => { setMenu(false); onGrownUp(); }} />}
    </div>
  );
}

function GrownUps({ s, onClose, onFull }: { s: Save; onClose: () => void; onFull: () => void }) {
  const [rt, setRt] = useState('');
  const [rc, setRc] = useState('10');
  const has = (t: string) => s.oaths.find((o) => o.kind === 'daily' && o.title === t);
  const all = [0, 1, 2, 3, 4, 5, 6];
  const toggle = (p: typeof KID_PRESETS[number]) => {
    const o = has(p.title);
    if (o) act(`Remove ${p.title}`, (x) => deleteOath(x, o.id), { undo: true });
    else act(`Add ${p.title}`, (x, n) => { addOath(x, { kind: 'daily', title: p.title, difficulty: 'trivial', stat: p.stat, days: all }, n).icon = p.icon; });
    refreshBadge();
  };
  return (
    <Sheet title={`Grown-ups: ${s.hero.name}`} onClose={onClose}>
      <p class="hint">Picture jobs for {s.hero.name}. Each one gives a star or two. Missing one never costs anything.</p>
      <div class="kid-presets">
        {KID_PRESETS.map((p) => (
          <button key={p.title} class={has(p.title) ? 'pill on' : 'pill'} aria-pressed={!!has(p.title)} onClick={() => toggle(p)}>{p.icon} {p.title}</button>
        ))}
      </div>
      <h3>Treats</h3>
      {s.rewards.map((r) => (
        <div class="li" key={r.id}><span class="t">{r.title} · ⭐ {r.cost}</span><button class="ghost small" onClick={() => act('Remove treat', (x) => { x.rewards = x.rewards.filter((y) => y.id !== r.id); }, { undo: true })}>Remove</button></div>
      ))}
      <form class="addstep" onSubmit={(e) => { e.preventDefault(); if (act('Add treat', (x) => addReward(x, rt, Number(rc))) !== false) { setRt(''); } }}>
        <input value={rt} maxLength={40} placeholder="🍦 Ice cream" onInput={(e) => setRt((e.target as HTMLInputElement).value)} aria-label="Treat name" />
        <input class="num" type="number" min={1} max={200} value={rc} onInput={(e) => setRc((e.target as HTMLInputElement).value)} aria-label="Stars" />
        <button class="secondary" type="submit">Add</button>
      </form>
      <h3>Reminder</h3>
      <label class="check"><input type="checkbox" checked={s.settings.reminder.on} onChange={(e) => { act('Reminder', (x) => { x.settings.reminder.on = (e.target as HTMLInputElement).checked; }); planReminders(); }} /> Remind at <input class="time" type="time" value={s.settings.reminder.time} onChange={(e) => { act('Reminder time', (x) => { x.settings.reminder.time = (e.target as HTMLInputElement).value || '18:30'; }); planReminders(); }} /></label>
      <div class="row">
        <button class="secondary" onClick={() => { onClose(); openSheet('family'); }}>Switch hero</button>
        <button class="secondary" onClick={onFull}>All menus</button>
      </div>
    </Sheet>
  );
}
