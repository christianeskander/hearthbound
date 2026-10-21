import { useState } from 'preact/hooks';
import { DIFF, STATS } from '../engine/content';
import { isDueOn, preview, today } from '../engine/rules';
import type { Oath, OathKind, Save } from '../engine/types';
import { keep, slip } from './actions';
import { Icon } from './icons';
import { OathForm } from './OathForm';
import { HeroStrip } from './HallTab';
import { Seg } from './Sheet';

const daysLabel = (d: number[]) => (d.length === 7 ? 'Every day' : d.length === 5 && !d.includes(0) && !d.includes(6) ? 'Weekdays' : d.map((x) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x]).join(' '));

export function OathsTab({ s }: { s: Save }) {
  const [kind, setKind] = useState<OathKind>('daily');
  const [edit, setEdit] = useState<Oath | 'new' | null>(null);
  const [showDone, setShowDone] = useState(false);
  const now = Date.now();
  const d = today(s, now);
  const list = s.oaths.filter((o) => o.kind === kind && (kind !== 'todo' || !o.done));
  const doneTodos = s.oaths.filter((o) => o.kind === 'todo' && o.done);
  return (
    <div class="tab">
      <HeroStrip s={s} />
      <Seg label="Oath kinds" value={kind} onChange={setKind} options={[{ id: 'daily', label: 'Dailies' }, { id: 'habit', label: 'Habits' }, { id: 'todo', label: 'Errands' }]} />
      <p class="hint">{kind === 'daily' ? `Due on set days. Keep them before the day turns at ${s.settings.dayStart}:00am. A miss costs some vitality and resets the streak, unless an ember token covers it. Pick a missed one back up and it pays extra.` : kind === 'habit' ? 'Tap + when you do a good thing, − when you slip. No schedule, no streak to lose. Repeat + taps on the same day pay a little less each time.' : 'One-off jobs. Tick them off once.'}</p>
      <div class="oaths">
        {list.length === 0 && <div class="empty">Nothing here yet. Start with something small enough to do on a bad day.</div>}
        {list.map((o) => {
          const p = preview(s, o, now);
          if (o.kind === 'habit') return (
            <div class="oath habit" key={o.id}>
              <button class="hbtn minus" disabled={!o.down} onClick={() => slip(o)} aria-label={`Slip: ${o.title}`}>−</button>
              <button class="body" onClick={() => setEdit(o)}>
                <b>{o.title}</b>
                <span>{DIFF[o.difficulty].label} · {STATS[o.stat].name}{o.up ? ` · + earns ${p.gold} gold` : ''}{o.ups || o.downs ? ` · today +${o.ups}/−${o.downs}` : ''}</span>
              </button>
              <button class="hbtn plus" disabled={!o.up} onClick={() => keep(o)} aria-label={`Did it: ${o.title}, earns ${p.gold} gold`}>+</button>
            </div>
          );
          const due = o.kind === 'todo' || isDueOn(o, d);
          const done = o.kind === 'daily' && o.doneDay === d;
          return (
            <div class={`oath ${done ? 'done' : ''} ${!due ? 'off' : ''}`} key={o.id}>
              <button class="tick" disabled={done || !due} aria-pressed={done} onClick={() => keep(o)} aria-label={done ? `${o.title}, kept` : due ? `Keep ${o.title}` : `${o.title}, not due today`}>{done ? '✓' : ''}</button>
              <button class="body" onClick={() => setEdit(o)}>
                <b>{o.title}</b>
                <span>{DIFF[o.difficulty].label} · {STATS[o.stat].name}{o.kind === 'daily' ? ` · ${daysLabel(o.days)}` : ''}</span>
              </button>
              <div class="side">
                {o.kind === 'daily' && o.streak > 0 && <span class="streak" title="Streak"><Icon name="flame" size={12} />{o.streak}</span>}
                <span class="pay">{done ? 'Kept' : due ? <>+{p.gold}<Icon name="coin" size={10} /></> : 'Not today'}</span>
              </div>
            </div>
          );
        })}
      </div>
      {kind === 'todo' && doneTodos.length > 0 && (
        <div class="donebox">
          <button class="link" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'} {doneTodos.length} finished</button>
          {showDone && doneTodos.map((o) => <div class="oath done" key={o.id}><span class="tick">✓</span><button class="body" onClick={() => setEdit(o)}><b>{o.title}</b><span>Cleared a week after finishing</span></button></div>)}
        </div>
      )}
      <button class="fab primary" onClick={() => setEdit('new')}>+ New {kind === 'daily' ? 'daily' : kind === 'habit' ? 'habit' : 'errand'}</button>
      {edit && <OathForm oath={edit === 'new' ? undefined : edit} kind={kind} onClose={() => setEdit(null)} />}
    </div>
  );
}
