import { useEffect, useRef, useState } from 'preact/hooks';
import { CALLINGS, FAMILIARS, OUTFITS, gearById } from '../engine/content';
import { newSave, validateNewHero, type NewHero } from '../engine/save';
import type { Slot } from '../engine/types';
import { HAIRS, HAIR_COLORS, PET_ART, SKINS, SKIN_NAMES } from '../art/look';
import { RAMPS } from '../art/palettes';
import { Stage } from './Stage';
import { addHero, replaceSave, setAdding, toast } from './store';
import { MODE_NAMES } from '../engine/family';
import type { HeroMode } from '../engine/types';

function equippedFor(outfit: string, sex: 'female' | 'male') {
  const o = OUTFITS.find((x) => x.id === outfit)!;
  const e: Partial<Record<Slot, string>> = {};
  for (const id of o[sex]) e[gearById(id)!.slot] = id;
  return e;
}

export function useWidth(ref: { current: HTMLElement | null }, fallback = 360) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || fallback));
    ro.observe(el); setW(el.clientWidth || fallback);
    return () => ro.disconnect();
  }, []);
  return w;
}

export function Create({ onDone, onImport, adding = false }: { onDone: () => void; onImport: () => void; adding?: boolean }) {
  const [n, setN] = useState<NewHero>({ name: '', calling: 'warden', outfit: 'wayfarer', familiar: 'soot', look: { sex: 'female', skin: 'light', hair: 'ponytail', hairColor: 'chestnut' }, mode: 'standard' });
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box);
  const set = (p: Partial<NewHero>) => { setN({ ...n, ...p }); setErr(null); };
  const look = (p: Partial<NewHero['look']>) => set({ look: { ...n.look, ...p } });
  const begin = () => {
    const e = validateNewHero(n);
    if (e) { setErr(e); document.getElementById('hero-name')?.focus(); return; }
    if (adding) { try { addHero(n); setAdding(false); toast(`${n.name.trim()} joined the family.`, 'good'); } catch (x) { setErr((x as Error).message); return; } }
    else replaceSave(newSave(n, Date.now()));
    onDone();
  };
  const calling = CALLINGS.find((c) => c.id === n.calling)!;
  const fam = FAMILIARS.find((f) => f.id === n.familiar)!;
  return (
    <div class="create">
      <div class="create-stage" ref={box}>
        <Stage look={n.look} equipped={equippedFor(n.outfit, n.look.sex)} pet={n.familiar} place="inn" w={Math.ceil(w / 2)} h={112} zoom={2} label="Preview of your hero" />
        <div class="create-caption">
          <b>{n.name.trim() || 'Your hero'}</b> · {calling.name} · with {fam.name}
        </div>
      </div>
      <div class="create-body">
        <h1>{adding ? 'A new hero' : 'Light the hearth'}</h1>
        <p class="lead">{adding ? 'Each hero on this phone has their own oaths, gold and story.' : 'Make the person who walks the road. You can change their look later.'}</p>
        {adding && <button class="ghost small" onClick={() => setAdding(false)}>Cancel</button>}

        <h3>Who is it for?</h3>
        <div class="cards3 modes" role="radiogroup" aria-label="Kind of game">
          {(['standard', 'gentle', 'kid'] as HeroMode[]).map((m) => (
            <button key={m} role="radio" aria-checked={n.mode === m} class={n.mode === m ? 'pick on' : 'pick'} onClick={() => set({ mode: m })}>
              <b>{MODE_NAMES[m].name}</b><span>{MODE_NAMES[m].text}</span>
            </button>
          ))}
        </div>

        <label class="field">Name
          <input id="hero-name" value={n.name} maxLength={24} placeholder={n.mode === 'kid' ? 'e.g. Emma' : n.mode === 'gentle' ? 'e.g. Teegan' : 'e.g. Christian'} autoComplete="off" onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} />
        </label>

        <h3>Body</h3>
        <div class="pills" role="radiogroup" aria-label="Body">
          {(['female', 'male'] as const).map((sx) => <button key={sx} role="radio" aria-checked={n.look.sex === sx} class={n.look.sex === sx ? 'pill on' : 'pill'} onClick={() => look({ sex: sx })}>{sx === 'female' ? 'Woman' : 'Man'}</button>)}
        </div>
        <h3>Skin</h3>
        <div class="swatches" role="radiogroup" aria-label="Skin tone">
          {SKINS.map((k) => <button key={k} role="radio" aria-checked={n.look.skin === k} aria-label={SKIN_NAMES[k]} class={n.look.skin === k ? 'sw on' : 'sw'} style={{ background: RAMPS.body[k][3] }} onClick={() => look({ skin: k })} />)}
        </div>
        <h3>Hair</h3>
        <div class="pills" role="radiogroup" aria-label="Hair style">
          {HAIRS.map((h) => <button key={h.id} role="radio" aria-checked={n.look.hair === h.id} class={n.look.hair === h.id ? 'pill on' : 'pill'} onClick={() => look({ hair: h.id })}>{h.name}</button>)}
        </div>
        <div class="swatches" role="radiogroup" aria-label="Hair colour">
          {HAIR_COLORS.map((k) => <button key={k} role="radio" aria-checked={n.look.hairColor === k} aria-label={k.replace('_', ' ')} class={n.look.hairColor === k ? 'sw on' : 'sw'} style={{ background: RAMPS.hair[k][3] }} onClick={() => look({ hairColor: k })} />)}
        </div>

        <h3>Calling</h3>
        <p class="hint">{n.mode === 'kid' ? 'Pick any; it only changes small numbers.' : 'Your class. Each one bends the numbers a real amount.'}</p>
        <div class="cards2" role="radiogroup" aria-label="Calling">
          {CALLINGS.map((c) => (
            <button key={c.id} role="radio" aria-checked={n.calling === c.id} class={n.calling === c.id ? 'pick on' : 'pick'} onClick={() => set({ calling: c.id })}>
              <b>{c.name}</b><span>{c.blurb}</span><em>{c.perk}</em>
            </button>
          ))}
        </div>

        <h3>Starting clothes</h3>
        <div class="cards3" role="radiogroup" aria-label="Starting clothes">
          {OUTFITS.map((o) => (
            <button key={o.id} role="radio" aria-checked={n.outfit === o.id} class={n.outfit === o.id ? 'pick outfit on' : 'pick outfit'} onClick={() => set({ outfit: o.id })}>
              <Stage look={n.look} equipped={equippedFor(o.id, n.look.sex)} w={48} h={60} zoom={2} still="front" label={o.name} />
              <b>{o.name}</b>
            </button>
          ))}
        </div>

        <h3>Familiar</h3>
        <p class="hint">Walks at your heel. Pick any one to start; the rest can join later from the market.</p>
        <div class="fams" role="radiogroup" aria-label="Familiar">
          {FAMILIARS.map((f) => (
            <button key={f.id} role="radio" aria-checked={n.familiar === f.id} class={n.familiar === f.id ? 'pick fam on' : 'pick fam'} onClick={() => set({ familiar: f.id })}>
              <PetIcon id={f.id} />
              <b>{f.name}</b><span>{f.kind}</span><em>{f.gift}</em>
            </button>
          ))}
        </div>

        {err && <p class="error" role="alert">{err}</p>}
        <button class="primary big" onClick={begin}>Light the hearth</button>
        {!adding && <p class="hint center">Everything stays on this phone. No account, no network. <button class="link" onClick={onImport}>Restore a saved file</button></p>}
      </div>
    </div>
  );
}

export function PetIcon({ id, scale = 3 }: { id: string; scale?: number }) {
  const a = PET_ART[id];
  // Standing side view (the raven perched), so each reads as its animal.
  const frame = a.fly ? (a.idle ?? a.walk[0]) : a.walk[0];
  // One box size for every familiar, so they keep their true sizes next to each other.
  const w = 44;
  return (
    <span class="pet-icon" aria-hidden="true" style={{ width: w * scale + 'px', height: 26 * scale + 'px' }}>
      <span style={{
        width: a.w * scale + 'px', height: a.h * scale + 'px',
        backgroundImage: `url(${import.meta.env.BASE_URL}assets/${a.file})`,
        backgroundSize: `${a.w * scale * a.n}px ${a.h * scale}px`,
        backgroundPosition: `-${frame * a.w * scale}px 0`,
        bottom: -(a.h - a.foot) * scale + 'px', left: Math.round((w - a.w) / 2) * scale + 'px',
      }} />
    </span>
  );
}
