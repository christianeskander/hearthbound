import { useState } from 'preact/hooks';
import { FAMILIARS, GEAR, MATERIALS, RECIPES, gearById } from '../engine/content';
import { addReward, buyFamiliar, buyGear, buyReward, callFamiliar, canForge, equip, forge, priceOf, recipeNeeds } from '../engine/rules';
import type { Material, Save, Slot } from '../engine/types';
import { act, toast } from './store';
import { Icon } from './icons';
import { Seg, Sheet } from './Sheet';
import { Stage } from './Stage';
import { PetIcon } from './Create';

type Tab = 'gear' | 'familiars' | 'rewards' | 'forge';
const SLOT_NAMES: Record<Slot, string> = { head: 'Head', torso: 'Body', cloak: 'Cloak', legs: 'Legs', feet: 'Feet' };

export function MarketTab({ s }: { s: Save }) {
  const [tab, setTab] = useState<Tab>('gear');
  const [newReward, setNewReward] = useState(false);
  return (
    <div class="tab">
      <div class="market-head"><h2>Market</h2><span class="gold big"><Icon name="coin" size={18} /> {s.hero.gold} gold</span></div>
      <Seg label="Market" value={tab} onChange={setTab} options={[{ id: 'gear', label: 'Gear' }, { id: 'familiars', label: 'Familiars' }, { id: 'rewards', label: 'Rewards' }, { id: 'forge', label: 'Forge' }]} />
      {tab === 'gear' && <GearShop s={s} />}
      {tab === 'familiars' && <Familiars s={s} />}
      {tab === 'rewards' && <Rewards s={s} onNew={() => setNewReward(true)} />}
      {tab === 'forge' && <Forge s={s} />}
      {newReward && <RewardForm onClose={() => setNewReward(false)} />}
    </div>
  );
}

function GearShop({ s }: { s: Save }) {
  const items = GEAR.filter((g) => g.source === 'market' || s.hero.gear.includes(g.id) || g.source === 'forge');
  const slots: Slot[] = ['head', 'torso', 'cloak', 'legs', 'feet'];
  return (
    <>
      <p class="hint">Each card shows you wearing it. Bought gear goes straight on; swap any time on the Hero page.</p>
      {slots.map((slot) => (
        <section key={slot}>
          <h3>{SLOT_NAMES[slot]}</h3>
          <div class="gear-grid">
            {items.filter((g) => g.slot === slot).map((g) => {
              const owned = s.hero.gear.includes(g.id);
              const worn = s.hero.equipped[g.slot] === g.id;
              const cost = priceOf(s, g.price);
              const tryOn = { ...s.hero.equipped, [g.slot]: g.id };
              return (
                <div class={worn ? 'gear on' : 'gear'} key={g.id}>
                  <Stage look={s.hero.look} equipped={tryOn} w={48} h={60} zoom={2} still="side" label={`You in the ${g.name}`} />
                  <b>{g.name}</b>
                  <span class="bonus">{g.bonusText || 'Looks good'}</span>
                  {worn ? <button class="ghost small" disabled={slot === 'torso' || slot === 'legs' || slot === 'feet'} onClick={() => act('Take off', (x) => equip(x, null, slot))}>{slot === 'torso' || slot === 'legs' || slot === 'feet' ? 'Wearing' : 'Take off'}</button>
                    : owned ? <button class="secondary small" onClick={() => act('Wear', (x) => equip(x, g.id, slot))}>Wear</button>
                    : g.source === 'forge' ? <span class="tag">Forge only</span>
                    : <button class={s.hero.gold >= cost ? 'primary small' : 'secondary small'} disabled={s.hero.gold < cost} onClick={() => { if (act(`Buy ${g.name}`, (x, n) => buyGear(x, g.id, n), { undo: true }) !== false) toast(`The ${g.name} is yours, and on.`, 'good', true); }}>
                        <Icon name="coin" size={12} /> {cost}
                      </button>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}

function Familiars({ s }: { s: Save }) {
  return (
    <>
      <p class="hint">One walks with you at a time. Each brings a small gift.</p>
      <div class="fam-list">
        {FAMILIARS.map((f) => {
          const owned = s.hero.familiars.includes(f.id);
          const active = s.hero.familiar === f.id;
          const cost = priceOf(s, f.price);
          return (
            <div class={active ? 'fam-row on' : 'fam-row'} key={f.id}>
              <PetIcon id={f.id} />
              <div class="fam-text"><b>{f.name}</b><span>{f.kind}</span><em>{f.gift}</em></div>
              {active ? <span class="tag">With you</span>
                : owned ? <button class="secondary small" onClick={() => act('Call familiar', (x) => callFamiliar(x, f.id))}>Call</button>
                : <button class="primary small" disabled={s.hero.gold < cost} onClick={() => { if (act(`Adopt ${f.name}`, (x, n) => buyFamiliar(x, f.id, n), { undo: true }) !== false) toast(`${f.name} joins you on the road.`, 'good', true); }}><Icon name="coin" size={12} /> {cost}</button>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Rewards({ s, onNew }: { s: Save; onNew: () => void }) {
  return (
    <>
      <p class="hint">Real treats, priced in gold you earned. Buying one is the point: enjoy it.</p>
      <div class="rewards">
        {s.rewards.length === 0 && <div class="empty">Add something you would genuinely enjoy.</div>}
        {s.rewards.map((r) => (
          <div class="reward" key={r.id}>
            <div><b>{r.title}</b>{r.bought > 0 && <span class="dim"> · enjoyed {r.bought}×</span>}</div>
            <div class="row">
              <button class="ghost small" aria-label={`Remove ${r.title}`} onClick={() => { act('Remove reward', (x) => { x.rewards = x.rewards.filter((y) => y.id !== r.id); }, { undo: true }); toast('Removed.', 'info', true); }}>Remove</button>
              <button class="primary small" disabled={s.hero.gold < r.cost} onClick={() => { if (act(`Buy ${r.title}`, (x, n) => buyReward(x, r.id, n), { undo: true }) !== false) toast(`Enjoy: ${r.title}.`, 'good', true); }}><Icon name="coin" size={12} /> {r.cost}</button>
            </div>
          </div>
        ))}
      </div>
      <button class="secondary wide" onClick={onNew}>+ Add a reward</button>
    </>
  );
}

function RewardForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('30');
  return (
    <Sheet title="New reward" onClose={onClose}>
      <form class="form" onSubmit={(e) => { e.preventDefault(); if (act('Add reward', (x) => addReward(x, title, Number(cost))) !== false) { toast('Added to the market.', 'good'); onClose(); } }}>
        <label>What is it? <input value={title} maxLength={60} placeholder="e.g. A pastry from the good bakery" onInput={(e) => setTitle((e.target as HTMLInputElement).value)} /></label>
        <label>Price in gold <input type="number" inputMode="numeric" min={1} max={100000} value={cost} onInput={(e) => setCost((e.target as HTMLInputElement).value)} /></label>
        <p class="hint">A Steady daily pays about 4 gold, so 30 gold is roughly a week of one habit.</p>
        <div class="row end"><button type="submit" class="primary">Add</button></div>
      </form>
    </Sheet>
  );
}

function Forge({ s }: { s: Save }) {
  return (
    <>
      <p class="hint">Keeps sometimes drop materials. Might drops iron, Wit ink, Grit herbs, Craft thread; ember shards are rare from anything.</p>
      <div class="pack">
        {(Object.keys(MATERIALS) as Material[]).map((m) => <span key={m} class={s.materials[m] ? 'mat' : 'mat none'}>{MATERIALS[m].name} <b>{s.materials[m] || 0}</b></span>)}
      </div>
      <div class="recipes">
        {RECIPES.map((r) => {
          const why = canForge(s, r.id);
          const needs = recipeNeeds(s, r.id);
          const g = r.makes.gear ? gearById(r.makes.gear) : null;
          return (
            <div class="recipe" key={r.id}>
              {g ? <Stage look={s.hero.look} equipped={{ ...s.hero.equipped, [g.slot]: g.id }} w={48} h={60} zoom={1.5} still="side" label={r.name} /> : <span class="recipe-icon"><Icon name={r.makes.embers ? 'ember' : 'heart'} size={28} /></span>}
              <div class="recipe-text">
                <b>{r.name}</b>
                <span>{r.text}</span>
                <span class="needs">{Object.entries(needs).map(([k, v]) => `${MATERIALS[k as Material].name} ${s.materials[k as Material] || 0}/${v}`).join(' · ')}{r.gold ? ` · ${r.gold} gold` : ''}</span>
              </div>
              <button class="primary small" disabled={!!why} title={why || ''} onClick={() => { if (act(`Forge ${r.name}`, (x, n) => forge(x, r.id, n), { undo: true }) !== false) toast(`Forged: ${r.name}.`, 'good', true); }}>{why === 'Already forged.' ? 'Made' : 'Forge'}</button>
            </div>
          );
        })}
      </div>
    </>
  );
}
