import { useState } from 'preact/hooks';
import { DIFF, DIFFS, STATS, STAT_IDS } from '../engine/content';
import { addOath, deleteOath, editOath, validateOath, type OathInput } from '../engine/rules';
import type { Oath, OathKind } from '../engine/types';
import { act, toast } from './store';
import { Sheet, Seg } from './Sheet';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function OathForm({ oath, kind, onClose }: { oath?: Oath; kind: OathKind; onClose: () => void }) {
  const [f, setF] = useState<OathInput>(oath ? { kind: oath.kind, title: oath.title, notes: oath.notes, difficulty: oath.difficulty, stat: oath.stat, days: oath.days, up: oath.up, down: oath.down } : { kind, title: '', notes: '', difficulty: 'easy', stat: 'grit', days: [0, 1, 2, 3, 4, 5, 6], up: true, down: false });
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<OathInput>) => { setF({ ...f, ...p }); setErr(null); };
  const save = (e: Event) => {
    e.preventDefault();
    const v = validateOath(f);
    if (v) { setErr(v); return; }
    if (oath) act('Edit oath', (s) => editOath(s, oath.id, f), { undo: true });
    else act('New oath', (s, now) => addOath(s, f, now), { undo: true });
    toast(oath ? 'Saved.' : `Sworn: "${f.title.trim()}"`, 'good');
    onClose();
  };
  const del = () => {
    if (!oath) return;
    act(`Delete "${oath.title}"`, (s) => deleteOath(s, oath.id), { undo: true });
    toast(`Deleted "${oath.title}".`, 'info', true);
    onClose();
  };
  const label = f.kind === 'daily' ? 'daily' : f.kind === 'habit' ? 'habit' : 'errand';
  const d = DIFF[f.difficulty];
  return (
    <Sheet title={oath ? `Edit ${label}` : `New ${label}`} onClose={onClose}>
      <form class="form" onSubmit={save}>
        {!oath && <Seg label="Kind" value={f.kind} onChange={(k) => set({ kind: k })} options={[{ id: 'daily', label: 'Daily' }, { id: 'habit', label: 'Habit' }, { id: 'todo', label: 'Errand' }]} />}
        <label>Name
          <input value={f.title} maxLength={80} placeholder={f.kind === 'daily' ? 'e.g. Take meds with breakfast' : f.kind === 'habit' ? 'e.g. Stood up and stretched' : 'e.g. Return the parcel'} onInput={(e) => set({ title: (e.target as HTMLInputElement).value })} />
        </label>
        <fieldset><legend>Difficulty sets the reward</legend>
          <div class="pills">{DIFFS.map((x) => <button type="button" key={x} class={f.difficulty === x ? 'pill on' : 'pill'} aria-pressed={f.difficulty === x} onClick={() => set({ difficulty: x })}>{DIFF[x].label}</button>)}</div>
          <p class="hint">Pays about +{d.gold} gold and +{d.xp} XP. {f.kind === 'daily' ? `A miss costs about ${d.hurt} vitality.` : f.kind === 'habit' ? `A − costs about ${Math.round(d.hurt / 2)}.` : ''}</p>
        </fieldset>
        <fieldset><legend>Trains</legend>
          <div class="pills">{STAT_IDS.map((x) => <button type="button" key={x} class={f.stat === x ? 'pill on' : 'pill'} aria-pressed={f.stat === x} onClick={() => set({ stat: x })}>{STATS[x].name}</button>)}</div>
          <p class="hint">{STATS[f.stat].about}</p>
        </fieldset>
        {f.kind === 'daily' && (
          <fieldset><legend>Due on</legend>
            <div class="days">{[1, 2, 3, 4, 5, 6, 0].map((i) => {
              const n = DAYS[i];
              const on = f.days!.includes(i);
              return <button type="button" key={n} class={on ? 'pill on' : 'pill'} aria-pressed={on} onClick={() => set({ days: on ? f.days!.filter((x) => x !== i) : [...f.days!, i] })}>{n}</button>;
            })}</div>
          </fieldset>
        )}
        {f.kind === 'habit' && (
          <fieldset><legend>Sides</legend>
            <label class="check"><input type="checkbox" checked={f.up} onChange={(e) => set({ up: (e.target as HTMLInputElement).checked })} /> + Good when I do it</label>
            <label class="check"><input type="checkbox" checked={f.down} onChange={(e) => set({ down: (e.target as HTMLInputElement).checked })} /> − Costs a little when I slip</label>
          </fieldset>
        )}
        <label>Notes <textarea rows={2} value={f.notes} maxLength={400} onInput={(e) => set({ notes: (e.target as HTMLTextAreaElement).value })} /></label>
        {err && <p class="error" role="alert">{err}</p>}
        <div class="row end">
          {oath && <button type="button" class="danger ghost" onClick={del}>Delete</button>}
          <button type="submit" class="primary">{oath ? 'Save' : 'Swear it'}</button>
        </div>
      </form>
    </Sheet>
  );
}
