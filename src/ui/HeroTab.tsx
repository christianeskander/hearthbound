import { useRef, useState } from 'preact/hooks';
import { CALLINGS, GEAR, PERKS, STATS, STAT_IDS, familiarById } from '../engine/content';
import { canLearn, equip, learnPerk, maxHp, mods, statRank } from '../engine/rules';
import { exportSave, importSave } from '../engine/save';
import type { Save, Slot } from '../engine/types';
import { HAIRS, HAIR_COLORS, SKINS, SKIN_NAMES } from '../art/look';
import { RAMPS } from '../art/palettes';
import { act, replaceSave, toast } from './store';
import { Stage } from './Stage';
import { Sheet } from './Sheet';
import { useWidth } from './Create';

const SLOTS: { id: Slot; name: string }[] = [{ id: 'head', name: 'Head' }, { id: 'torso', name: 'Body' }, { id: 'cloak', name: 'Cloak' }, { id: 'legs', name: 'Legs' }, { id: 'feet', name: 'Feet' }];
const pct = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

export function HeroTab({ s }: { s: Save }) {
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box);
  const [lookOpen, setLookOpen] = useState(false);
  const [allLog, setAllLog] = useState(false);
  const h = s.hero;
  const m = mods(s, false);
  const calling = CALLINGS.find((c) => c.id === h.calling)!;
  const fam = familiarById(h.familiar)!;
  return (
    <div class="tab hero-tab">
      <div class="hero-stage" ref={box}>
        <Stage look={h.look} equipped={h.equipped} pet={h.familiar} place={s.settings.location} w={Math.ceil(w / 2)} h={112} zoom={2} />
      </div>
      <div class="card">
        <div class="hero-head">
          <div><h2>{h.name}</h2><p class="dim">Level {h.level} {calling.name} · walks with {fam.name}, {fam.kind}</p></div>
          <button class="secondary small" onClick={() => setLookOpen(true)}>Change look</button>
        </div>
        <p class="dim">{calling.perk}. {fam.gift}.</p>
        {h.titles.length > 0 && (
          <label class="field">Title
            <select value={h.title || ''} onChange={(e) => act('Title', (x) => { x.hero.title = (e.target as HTMLSelectElement).value || null; })}>
              <option value="">No title</option>
              {h.titles.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        )}
      </div>

      <div class="card">
        <div class="kicker">Wearing</div>
        {SLOTS.map((sl) => {
          const owned = GEAR.filter((g) => g.slot === sl.id && h.gear.includes(g.id));
          const canEmpty = sl.id === 'head' || sl.id === 'cloak';
          return (
            <div class="slot" key={sl.id}>
              <span class="slot-name">{sl.name}</span>
              <div class="pills">
                {canEmpty && <button class={!h.equipped[sl.id] ? 'pill on' : 'pill'} onClick={() => act('Take off', (x) => equip(x, null, sl.id))}>None</button>}
                {owned.map((g) => <button key={g.id} class={h.equipped[sl.id] === g.id ? 'pill on' : 'pill'} aria-pressed={h.equipped[sl.id] === g.id} onClick={() => act('Wear', (x) => equip(x, g.id, sl.id))}>{g.name}</button>)}
                {!owned.length && !canEmpty && <span class="dim">—</span>}
                {!owned.length && canEmpty && <span class="dim small">More in the market</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div class="card">
        <div class="kicker">Stats</div>
        <div class="stats">
          {STAT_IDS.map((st) => {
            const xp = h.statXp[st] || 0, r = statRank(xp), next = 3 * (r + 1) * (r + 1);
            return (
              <div class="stat" key={st}>
                <b>{STATS[st].name} <span class="rank">{r}</span></b>
                <span class="dim">{STATS[st].about}</span>
                <div class="bar thin"><i style={{ width: `${Math.min(100, (100 * (xp - 3 * r * r)) / (next - 3 * r * r))}%` }} /></div>
                <span class="dim small">{STATS[st].effect}</span>
              </div>
            );
          })}
        </div>
        <p class="dim small">All bonuses now: XP {pct(m.xp)}, gold {pct(m.gold)}, mana {pct(m.mana)}, strikes {pct(m.strike)}, misses hurt {Math.round(m.missCut * 100)}% less, bright keeps {Math.round(m.crit * 100)}%, combo window {m.comboWindow} min, max vitality {maxHp(s)}.</p>
      </div>

      <div class="card">
        <div class="kicker">Skills {h.skillPoints > 0 && <span class="badge">{h.skillPoints} point{h.skillPoints > 1 ? 's' : ''} to spend</span>}</div>
        <p class="hint">One point per level. Each branch unlocks top to bottom.</p>
        <div class="tree">
          {(['hearth', 'blade', 'craft'] as const).map((b) => (
            <div class="branch" key={b}>
              <h4>{b === 'hearth' ? 'Hearth' : b === 'blade' ? 'Blade' : 'Craft'}</h4>
              {PERKS.filter((p) => p.branch === b).map((p) => {
                const has = h.perks.includes(p.id);
                const why = canLearn(s, p.id);
                return (
                  <button key={p.id} class={has ? 'perk has' : why ? 'perk' : 'perk ready'} disabled={has || !!why} onClick={() => { if (act(`Learn ${p.name}`, (x, n) => learnPerk(x, p.id, n)) !== false) toast(`Learned ${p.name}.`, 'good'); }} title={why || ''}>
                    <b>{p.name}</b><span>{p.text}</span>{has && <em>Learned</em>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div class="card">
        <div class="kicker">Record</div>
        <div class="record">
          <span><b>{s.stats.keeps}</b> keeps</span><span><b>{s.stats.misses}</b> misses</span><span><b>{s.stats.focusMinutes}</b> focus min</span><span><b>{s.stats.bossesDown}</b> foes beaten</span>
          <span><b>{Math.max(0, ...s.oaths.map((o) => o.bestStreak))}</b> best streak</span>
        </div>
        {h.titles.length > 0 && <p class="dim">Titles: {h.titles.join(' · ')}</p>}
      </div>

      <div class="card">
        <div class="kicker">Chronicle</div>
        <ol class="chron">
          {(allLog ? s.chronicle : s.chronicle.slice(0, 12)).map((c, i) => (
            <li key={i} class={c.kind}><time>{new Date(c.t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time>{c.text}</li>
          ))}
        </ol>
        {s.chronicle.length > 12 && <button class="link" onClick={() => setAllLog(!allLog)}>{allLog ? 'Show less' : `Show all ${s.chronicle.length}`}</button>}
      </div>

      <Settings s={s} />
      {lookOpen && <LookSheet s={s} onClose={() => setLookOpen(false)} />}
    </div>
  );
}

function LookSheet({ s, onClose }: { s: Save; onClose: () => void }) {
  const l = s.hero.look;
  const set = (p: Partial<typeof l>) => act('Change look', (x) => { x.hero.look = { ...x.hero.look, ...p }; });
  return (
    <Sheet title="Change look" onClose={onClose}>
      <div class="look-preview"><Stage look={l} equipped={s.hero.equipped} w={80} h={66} zoom={2} /></div>
      <h3>Body</h3>
      <div class="pills">{(['female', 'male'] as const).map((sx) => <button key={sx} class={l.sex === sx ? 'pill on' : 'pill'} aria-pressed={l.sex === sx} onClick={() => set({ sex: sx })}>{sx === 'female' ? 'Woman' : 'Man'}</button>)}</div>
      <h3>Skin</h3>
      <div class="swatches">{SKINS.map((k) => <button key={k} aria-label={SKIN_NAMES[k]} class={l.skin === k ? 'sw on' : 'sw'} style={{ background: RAMPS.body[k][3] }} onClick={() => set({ skin: k })} />)}</div>
      <h3>Hair</h3>
      <div class="pills">{HAIRS.map((x) => <button key={x.id} class={l.hair === x.id ? 'pill on' : 'pill'} onClick={() => set({ hair: x.id })}>{x.name}</button>)}</div>
      <div class="swatches">{HAIR_COLORS.map((k) => <button key={k} aria-label={k} class={l.hairColor === k ? 'sw on' : 'sw'} style={{ background: RAMPS.hair[k][3] }} onClick={() => set({ hairColor: k })} />)}</div>
      <div class="row end"><button class="primary" onClick={onClose}>Done</button></div>
    </Sheet>
  );
}

function Settings({ s }: { s: Save }) {
  const file = useRef<HTMLInputElement>(null);
  const doExport = () => {
    const blob = new Blob([exportSave(s)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hearthbound-${s.hero.name.replace(/\W+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Saga exported. Keep the file somewhere safe.', 'good');
  };
  return (
    <div class="card">
      <div class="kicker">Settings & ledger</div>
      <label class="field">The day turns at
        <select value={s.settings.dayStart} onChange={(e) => act('Day turn', (x) => { x.settings.dayStart = Number((e.target as HTMLSelectElement).value); })}>
          {[0, 1, 2, 3, 4, 5, 6].map((hh) => <option key={hh} value={hh}>{hh === 0 ? 'Midnight' : `${hh}:00am`}</option>)}
        </select>
      </label>
      <label class="check"><input type="checkbox" checked={s.settings.sound} onChange={(e) => act('Sound', (x) => { x.settings.sound = (e.target as HTMLInputElement).checked; })} /> Sounds on keeps</label>
      <p class="hint">Your saga lives only on this device, with a backup copy beside it. Export a file now and then, so a new phone can pick it up.</p>
      <div class="row">
        <button class="secondary" onClick={doExport}>Export saga</button>
        <button class="secondary" onClick={() => file.current?.click()}>Import saga</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e, s.hero.name)} />
      </div>
      <div class="row"><button class="danger ghost small" onClick={() => { if (confirm('Start a new life? This hero is replaced (a backup copy is kept). Export first if you want them back.')) { replaceSave(null); } }}>Start a new life</button></div>
    </div>
  );
}

export async function importFile(e: Event, current?: string) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  try {
    const save = importSave(await f.text());
    const ok = !current || confirm(`Replace ${current} with ${save.hero.name} (level ${save.hero.level}) from this file? The current saga is kept as the backup copy.`);
    if (ok) { replaceSave(save); toast(`Welcome back, ${save.hero.name}.`, 'good'); }
  } catch (err) {
    toast(`Could not import: ${(err as Error).message} Nothing was changed.`, 'bad');
  }
}

