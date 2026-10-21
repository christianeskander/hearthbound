import { useEffect, useRef, useState } from 'preact/hooks';
import { CHORE_ART, CHORE_IDEAS, MAX_STEPS, addChore, addStep, choreBonus, choreHp, deleteChore, nextStep, strikeChore, validateChore } from '../engine/chores';
import { DIFF, DIFFS, STATS, STAT_IDS } from '../engine/content';
import { BOSS_ART } from '../art/look';
import { loadImage } from '../art/compose';
import type { Chore, Difficulty, Save, Stat } from '../engine/types';
import { act, toast } from './store';
import { Sheet } from './Sheet';
import { after, extras } from './actions';
import { sfx } from './audio';

/** One frame of a foe sprite, drawn small for cards and lists. */
export function FoeThumb({ id, size = 48, gray = false }: { id: string; size?: number; gray?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const a = BOSS_ART[id] || BOSS_ART.slime;
    loadImage(a.file).then((im) => {
      const c = ref.current; if (!c) return;
      const cols = Math.max(1, Math.floor(im.width / a.w));
      const f = a.walk[0];
      // crop the frame to its visible pixels so small foes still fill the thumb
      const o = document.createElement('canvas'); o.width = a.w; o.height = a.h;
      const og = o.getContext('2d')!;
      og.drawImage(im, (f % cols) * a.w, Math.floor(f / cols) * a.h, a.w, a.h, 0, 0, a.w, a.h);
      let x0 = a.w, y0 = a.h, x1 = -1, y1 = -1;
      try {
        const d = og.getImageData(0, 0, a.w, a.h).data;
        for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) if (d[(y * a.w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      } catch { x0 = 0; y0 = 0; x1 = a.w - 1; y1 = a.h - 1; }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = a.w - 1; y1 = a.h - 1; }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, side = Math.max(w, h);
      const k = Math.min(4, (c.width * 0.92) / side);
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(o, x0, y0, w, h, Math.round((c.width - w * k) / 2), Math.round(c.height - h * k - (c.height - h * k) / 4), Math.round(w * k), Math.round(h * k));
    }).catch(() => {});
  }, [id]);
  return <canvas ref={ref} width={96} height={96} class={gray ? 'foe-thumb gray' : 'foe-thumb'} style={{ width: size + 'px', height: size + 'px' }} aria-hidden="true" />;
}

export function hitStep(c: Chore) {
  const st = nextStep(c);
  if (!st) return;
  doStep(c, st.id, st.title);
}
function doStep(c: Chore, stepId: string, title: string) {
  const r = act(`Step: ${title}`, (s, now) => strikeChore(s, c.id, stepId, now), { undo: true });
  if (!r) return;
  after(r, title);
  if (r.choreDown) setTimeout(() => { sfx.boss(); toast(`${c.name} is beaten! +${r.bonus!.gold} gold, +${r.bonus!.xp} XP.`, 'good', false, 6500); }, 500);
}

/** On the Hall: the next step of the big task you touched most recently. */
export function ChoreCard({ s }: { s: Save }) {
  const live = s.chores.filter((c) => !c.beatenAt);
  if (!live.length) return null;
  const c = [...live].sort((a, b) => Math.max(b.createdAt, ...b.steps.map((x) => x.doneAt || 0)) - Math.max(a.createdAt, ...a.steps.map((x) => x.doneAt || 0)))[0];
  const st = nextStep(c)!;
  const hp = choreHp(c);
  return (
    <div class="card chore-card">
      <div class="kicker">Big task <span class="count">{hp}/{c.steps.length} steps left</span></div>
      <div class="chore-row">
        <FoeThumb id={c.art} size={44} />
        <div class="chore-text">
          <b>{c.name}</b>
          <div class="bar foe"><i style={{ width: `${(100 * hp) / c.steps.length}%` }} /></div>
          <span class="dim small">Next: {st.title}</span>
        </div>
      </div>
      <button class="primary wide" onClick={() => hitStep(c)}>Done: {st.title}</button>
      {live.length > 1 && <p class="hint">{live.length - 1} more big task{live.length > 2 ? 's' : ''} on the Oaths tab.</p>}
    </div>
  );
}

export function ChoresPanel({ s }: { s: Save }) {
  const [form, setForm] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const live = s.chores.filter((c) => !c.beatenAt), beaten = s.chores.filter((c) => c.beatenAt);
  return (
    <div class="chores">
      <p class="hint">Turn one big, dreaded job into a foe. Its health is its steps: each small step is a hit (and pays like an errand), and the last one beats it for a bonus. Smaller steps are better.</p>
      {live.length === 0 && <div class="empty">No big tasks right now. Is there one thing you keep putting off?</div>}
      {live.map((c) => {
        const hp = choreHp(c), isOpen = open === c.id;
        return (
          <div class="card chore" key={c.id}>
            <button class="chore-row as-btn" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}>
              <FoeThumb id={c.art} size={44} />
              <div class="chore-text">
                <b>{c.name}</b>
                <div class="bar foe"><i style={{ width: `${(100 * hp) / c.steps.length}%` }} /></div>
                <span class="dim small">{hp} of {c.steps.length} steps left · beat it for +{choreBonus(c).gold} gold</span>
              </div>
            </button>
            {isOpen ? (
              <>
                <ol class="steps">
                  {c.steps.map((st) => (
                    <li key={st.id} class={st.done ? 'done' : ''}>
                      <button class="tick" disabled={st.done} aria-pressed={st.done} onClick={() => doStep(c, st.id, st.title)} aria-label={st.done ? `${st.title}, done` : `Do ${st.title}`}>{st.done ? '✓' : ''}</button>
                      <span>{st.title}</span>
                    </li>
                  ))}
                </ol>
                <AddStep c={c} />
                <div class="row end"><button class="ghost small danger" onClick={() => { if (confirm(`Let go of ${c.name}? Steps already done keep their rewards.`)) act('Remove big task', (x) => deleteChore(x, c.id), { undo: true }); }}>Let it go</button></div>
              </>
            ) : <button class="secondary wide" onClick={() => hitStep(c)}>Next: {nextStep(c)!.title}</button>}
          </div>
        );
      })}
      {beaten.length > 0 && <p class="dim small">Beaten lately: {beaten.map((c) => c.name).join(', ')}.</p>}
      <button class="fab primary" onClick={() => setForm(true)}>+ New big task</button>
      {form && <ChoreForm s={s} onClose={() => setForm(false)} />}
    </div>
  );
}

function AddStep({ c }: { c: Chore }) {
  const [t, setT] = useState('');
  if (c.steps.length >= MAX_STEPS) return null;
  return (
    <form class="addstep" onSubmit={(e) => { e.preventDefault(); if (!t.trim()) return; if (act('Add step', (x) => addStep(x, c.id, t)) !== false) setT(''); }}>
      <input value={t} maxLength={80} placeholder="Add a step" onInput={(e) => setT((e.target as HTMLInputElement).value)} />
      <button class="secondary" type="submit">Add</button>
    </form>
  );
}

function ChoreForm({ s, onClose }: { s: Save; onClose: () => void }) {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<string[]>(['', '', '']);
  const [diff, setDiff] = useState<Difficulty>('easy');
  const [stat, setStat] = useState<Stat>('craft');
  const [art, setArt] = useState<string>(CHORE_ART[s.chores.length % CHORE_ART.length]);
  const [err, setErr] = useState<string | null>(null);
  const idea = CHORE_IDEAS[s.chores.length % CHORE_IDEAS.length];
  const save = (e: Event) => {
    e.preventDefault();
    const input = { name, steps, difficulty: diff, stat, art };
    const v = validateChore(input);
    if (v) { setErr(v); return; }
    const r = act('New big task', (x, n) => addChore(x, input, n), { undo: true });
    if (r) { toast(`${r.name} appears: ${r.steps.length} steps to beat it.`, 'good'); onClose(); }
  };
  const setStep = (i: number, v: string) => { const n = [...steps]; n[i] = v; if (i === n.length - 1 && v && n.length < MAX_STEPS) n.push(''); setSteps(n); setErr(null); };
  return (
    <Sheet title="New big task" onClose={onClose}>
      <form class="form" onSubmit={save}>
        <label>What is the big task?
          <input value={name} maxLength={40} placeholder={`e.g. ${idea}`} onInput={(e) => { setName((e.target as HTMLInputElement).value); setErr(null); }} />
        </label>
        <fieldset><legend>Its steps (each one small enough to start now)</legend>
          {steps.map((st, i) => <input key={i} class="step-in" value={st} maxLength={80} placeholder={i === 0 ? 'e.g. Get three bin bags' : i === 1 ? 'e.g. Clear one shelf' : 'Another step (optional)'} onInput={(e) => setStep(i, (e.target as HTMLInputElement).value)} />)}
        </fieldset>
        <fieldset><legend>Each step pays like</legend>
          <div class="pills">{DIFFS.map((x) => <button type="button" key={x} class={diff === x ? 'pill on' : 'pill'} aria-pressed={diff === x} onClick={() => setDiff(x)}>{DIFF[x].label}</button>)}</div>
        </fieldset>
        <fieldset><legend>Trains</legend>
          <div class="pills">{STAT_IDS.map((x) => <button type="button" key={x} class={stat === x ? 'pill on' : 'pill'} aria-pressed={stat === x} onClick={() => setStat(x)}>{STATS[x].name}</button>)}</div>
        </fieldset>
        <fieldset><legend>Its look</legend>
          <div class="pills foe-pick">{CHORE_ART.map((a) => <button type="button" key={a} class={art === a ? 'pill on' : 'pill'} aria-pressed={art === a} aria-label={a} onClick={() => setArt(a)}><FoeThumb id={a} size={30} /></button>)}</div>
        </fieldset>
        {err && <p class="bad" role="alert">{err}</p>}
        <button class="primary big" type="submit">Name it</button>
      </form>
    </Sheet>
  );
}
export { extras };
