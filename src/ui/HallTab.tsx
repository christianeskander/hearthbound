import { useEffect, useRef, useState } from 'preact/hooks';
import { PLACES } from '../hall/layers';
import { loadImage } from '../art/compose';
import { BOSSES, DIFF, LOCATIONS, OMENS, STATS, MAX_EMBERS, REST_COST, KINDLE_COST, MATERIALS } from '../engine/content';
import {
  FOCUS_CHOICES, abandonQuest, cancelFocus, canInvite, finishFocus, focusLeft, focusPay, inviteBoss, isDueOn, kindle, maxHp, maxMana,
  nextOath, preview, rest, startFocus, today, xpToNext,
} from '../engine/rules';
import { accept, dismiss, mindLevel, suggest } from '../engine/mind';
import type { Save } from '../engine/types';
import { act, fx, toast } from './store';
import { keep } from './actions';
import { Icon } from './icons';
import { Sheet } from './Sheet';
import { sfx } from './sound';

export function Bars({ s }: { s: Save }) {
  const h = s.hero, mh = maxHp(s), mm = maxMana(s), nx = xpToNext(h.level);
  return (
    <div class="bars">
      <div class="barrow"><Icon name="heart" title="Vitality" /><div class="bar hp" role="meter" aria-label="Vitality" aria-valuenow={h.hp} aria-valuemax={mh}><i style={{ width: `${(100 * h.hp) / mh}%` }} /></div><span>{h.hp}/{mh}</span></div>
      <div class="barrow"><Icon name="xp" title="Experience" /><div class="bar xp" role="meter" aria-label="Experience" aria-valuenow={h.xp} aria-valuemax={nx}><i style={{ width: `${(100 * h.xp) / nx}%` }} /></div><span>{h.xp}/{nx}</span></div>
      <div class="barrow"><Icon name="mana" title="Mana" /><div class="bar mp" role="meter" aria-label="Mana" aria-valuenow={h.mana} aria-valuemax={mm}><i style={{ width: `${(100 * h.mana) / mm}%` }} /></div><span>{h.mana}/{mm}</span></div>
    </div>
  );
}

export function HeroStrip({ s }: { s: Save }) {
  const h = s.hero;
  const combo = s.day.combo > 1 && Date.now() - s.day.lastKeepAt < 20 * 60000 ? s.day.combo : 0;
  return (
    <div class="herostrip">
      <div class="who">
        <b>{h.name}</b>
        <span>Lv {h.level} {cap(h.calling)}{h.title ? ` · ${h.title}` : ''}</span>
      </div>
      <div class="purse">
        <span class="gold" aria-label={`${h.gold} gold`}><Icon name="coin" /> {h.gold}</span>
        <span class="embers" aria-label={`${h.embers} ember tokens`} title="Ember tokens forgive a missed daily"><Icon name="ember" /> {h.embers}</span>
        {combo > 0 && <span class="combo" aria-label={`Combo ${combo}`}>x{combo}</span>}
      </div>
    </div>
  );
}
const cap = (x: string) => x[0].toUpperCase() + x.slice(1);

function NextOath({ s, now }: { s: Save; now: number }) {
  const o = nextOath(s, now);
  const d = today(s, now);
  const due = s.oaths.filter((x) => isDueOn(x, d));
  const kept = due.filter((x) => x.doneDay === d).length;
  if (!o) {
    return (
      <div class="card next done">
        <div class="kicker">Today</div>
        {due.length ? <p><b>All {due.length} dailies kept.</b> The fire is warm. Anything else today is a bonus.</p> : <p>No dailies due today. Add one on the Oaths tab.</p>}
      </div>
    );
  }
  const p = preview(s, o, now);
  return (
    <div class="card next">
      <div class="kicker">Next oath <span class="count">{kept}/{due.length} kept today</span></div>
      <div class="next-row">
        <div class="next-text">
          <b>{o.title}</b>
          <span>{DIFF[o.difficulty].label} · {STATS[o.stat].name}{o.streak ? ` · ${o.streak}-day streak` : ''}</span>
        </div>
        <button class="keep" onClick={() => keep(o)} aria-label={`Keep ${o.title}, earns ${p.gold} gold and ${p.xp} XP`}>
          <span class="keep-label">Keep</span>
          <span class="keep-pay">earn <Icon name="coin" size={12} />+{p.gold}<span class="dim"> · +{p.xp} XP</span></span>
        </button>
      </div>
      {p.rekindle > 0 && <p class="hint">Welcome back to this one: picking it up again pays {Math.round(p.rekindle * 100)}% extra today.</p>}
      {p.combo > 1 && <p class="hint">Combo x{p.combo} is live: this keep pays {Math.round((p.combo - 1) * 10)}% more.</p>}
    </div>
  );
}

function TodayList({ s, now }: { s: Save; now: number }) {
  const d = today(s, now);
  const due = s.oaths.filter((x) => isDueOn(x, d));
  if (due.length < 2) return null;
  return (
    <div class="card list">
      <div class="kicker">Today's dailies</div>
      {due.map((o) => {
        const done = o.doneDay === d;
        return (
          <div class={done ? 'li done' : 'li'} key={o.id}>
            <button class="tick" aria-pressed={done} disabled={done} onClick={() => keep(o)} aria-label={done ? `${o.title}, kept` : `Keep ${o.title}`}>{done ? '✓' : ''}</button>
            <span class="t">{o.title}</span>
            <span class="m">{done ? 'Kept' : `+${preview(s, o, now).gold}`}{!done && <Icon name="coin" size={10} />}</span>
          </div>
        );
      })}
    </div>
  );
}

function Dawn({ s }: { s: Save }) {
  const r = s.dawn;
  if (!r) return null;
  const omen = OMENS.find((o) => o.id === r.omen);
  const quiet = !r.missed.length && !r.forgiven.length && !r.gifts.length;
  return (
    <div class="card dawn" role="status">
      <div class="kicker">Dawn report{r.nights > 1 ? ` · ${r.nights} nights` : ''}</div>
      {r.keptYesterday > 0 && <p>You kept {r.keptYesterday} {r.keptYesterday === 1 ? 'daily' : 'dailies'} last time. Good.</p>}
      {quiet && <p>A quiet night. Nothing was missed.</p>}
      {r.forgiven.map((f, i) => <p key={'f' + i} class="good">{f.by === 'ember' ? 'An ember token' : 'Mercy'} covered “{f.title}”. Streak safe.</p>)}
      {r.missed.length > 0 && (
        <p>Missed: {r.missed.map((m) => `“${m.title}”`).join(', ')}. {r.hpLost > 0 ? `−${r.hpLost} vitality.` : ''}{r.bossHits ? ` ${r.bossName} hit back for ${r.bossHits}.` : ''}</p>
      )}
      {r.streaksBroken.length > 0 && <p class="dim">Streaks reset: {r.streaksBroken.map((b) => `${b.title} (${b.was})`).join(', ')}. They start again today.</p>}
      {r.fell && <p class="bad">You ran out of vitality and woke by the hearth, rested. {r.goldLost} gold and half this level's progress were lost. Your gear, titles and streak records stay.</p>}
      {r.gifts.map((g, i) => <p key={'g' + i} class="good">{g}</p>)}
      {omen && <p class="omen-line"><Icon name="moon" size={12} /> Today's omen: <b>{omen.name}</b>, {omen.text.toLowerCase()}.</p>}
      <div class="row end"><button class="ghost" onClick={() => act('Read dawn report', (x) => { x.dawn = null; })}>Got it</button></div>
    </div>
  );
}

function MindCard({ s, now }: { s: Save; now: number }) {
  const sug = suggest(s, now);
  const lvl = mindLevel(s);
  if (!sug) {
    return (
      <div class="card mind quiet">
        <div class="kicker">Hearthmind · {lvl.name}</div>
        <p class="dim">Watching what you keep and when. {lvl.next ? `${lvl.next - lvl.n} more moments until it grows.` : 'It knows your rhythms well.'} It learns only from this phone.</p>
      </div>
    );
  }
  const canAct = sug.kind === 'shrink' || sug.kind === 'untrained';
  return (
    <div class="card mind">
      <div class="kicker">Hearthmind · {lvl.name}</div>
      <p><b>{sug.title}.</b> {sug.text}</p>
      <p class="why">{sug.why}</p>
      <div class="row end">
        <button class="ghost" onClick={() => act('Dismiss', (x, n) => dismiss(x, sug, n))}>Not now</button>
        {canAct && <button class="secondary" onClick={() => { act('Hearthmind', (x, n) => accept(x, sug, n), { undo: true }); toast(sug.kind === 'shrink' ? 'Made smaller. Small and kept beats big and skipped.' : `Added "${sug.oath}" as a tiny daily.`, 'good', true); }}>{sug.kind === 'shrink' ? 'Make it smaller' : 'Add it'}</button>}
      </div>
    </div>
  );
}

function Quest({ s }: { s: Save }) {
  if (s.quest) {
    const b = BOSSES.find((x) => x.id === s.quest!.boss)!;
    return (
      <div class="card quest">
        <div class="kicker">Quest</div>
        <p><b>{b.name}</b> · {s.quest.hp}/{s.quest.max} left</p>
        <div class="bar foe"><i style={{ width: `${(100 * s.quest.hp) / s.quest.max}%` }} /></div>
        <p class="dim">Every keep strikes it. Each missed daily lets it hit you for {b.power} at dawn. Beat it for {b.gold} gold, {b.xp} XP and the title “{b.title}”.</p>
        <div class="row end"><button class="ghost small" onClick={() => { if (confirm(`Turn back from ${b.name}? Its health resets.`)) act('Turn back', (x, n) => abandonQuest(x, n)); }}>Turn back</button></div>
      </div>
    );
  }
  return (
    <div class="card quest">
      <div class="kicker">Quest</div>
      {BOSSES.map((b) => {
        const why = canInvite(s, b.id);
        const done = s.defeated.includes(b.id);
        return (
          <div class="foe-row" key={b.id}>
            <div><b>{b.name}</b>{done && <span class="tag">beaten</span>}<p class="dim">{b.blurb}</p></div>
            <button class="secondary" disabled={!!why} title={why || ''} onClick={() => { act('Start quest', (x, n) => inviteBoss(x, b.id, n)); toast(`${b.name} is on the road ahead.`, 'info'); }}>{why ? 'Locked' : done ? 'Again' : 'Face it'}</button>
          </div>
        );
      })}
    </div>
  );
}

function Focus({ s, now }: { s: Save; now: number }) {
  const [, tick] = useState(0);
  useEffect(() => { if (!s.focus) return; const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, [!!s.focus]);
  const left = focusLeft(s, Date.now());
  const finished = s.focus && left <= 0;
  useEffect(() => { if (finished && s.settings.sound) sfx.level(); }, [finished]);
  if (s.focus) {
    const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    const pay = focusPay(s, s.focus.minutes);
    const frac = 1 - left / (s.focus.minutes * 60000);
    return (
      <div class="card focus on">
        <div class="kicker">Focus rite · {s.focus.minutes} min</div>
        {finished ? <p><b>The rite is complete.</b> Well held.</p> : <p class="clock" aria-live="off">{mm}:{String(ss).padStart(2, '0')}</p>}
        <div class="bar rite"><i style={{ width: `${Math.min(100, frac * 100)}%` }} /></div>
        <p class="dim">Pays +{pay.xp} XP, +{pay.gold} gold, +{pay.mana} mana{pay.strike ? `, ${pay.strike} damage` : ''}. You can leave the app; it keeps time.</p>
        <div class="row end">
          {!finished && <button class="ghost" onClick={() => act('Cancel rite', (x) => cancelFocus(x))}>Stop early</button>}
          {finished && <button class="primary" onClick={() => {
            const r = act('Finish rite', (x, n) => finishFocus(x, n));
            if (r) { fx({ type: 'keep', gold: r.gold, xp: r.xp, strike: r.strike, bright: false, combo: 1, drop: null, levels: r.levels, bossDown: r.bossDown }); toast(`Rite complete: +${r.xp} XP · +${r.gold} gold · +${r.mana} mana`, 'good'); }
          }}>Claim</button>}
        </div>
      </div>
    );
  }
  return (
    <div class="card focus">
      <div class="kicker">Focus rite</div>
      <p class="dim">A timed block for one thing. Pick a length; it pays when the time is up.</p>
      <div class="row">
        {FOCUS_CHOICES.map((m) => <button key={m} class="secondary" onClick={() => { act('Start rite', (x, n) => startFocus(x, m, n)); toast(`Rite lit: ${m} minutes. One thing only.`, 'info'); }}>{m} min</button>)}
      </div>
    </div>
  );
}

function Hearth({ s }: { s: Save }) {
  return (
    <div class="card hearth">
      <div class="kicker">At the fire</div>
      <div class="row">
        <button class="secondary" disabled={s.day.rested || s.hero.mana < REST_COST} onClick={() => { const r = act('Rest', (x, n) => rest(x, n), { undo: true }); if (r !== false) toast(`Rested: +${r} vitality.`, 'good', true); }}>
          Rest <small>{s.day.rested ? 'done today' : `${REST_COST} mana, +15 vitality`}</small>
        </button>
        <button class="secondary" disabled={s.hero.embers >= MAX_EMBERS || s.hero.mana < KINDLE_COST} onClick={() => { if (act('Kindle', (x, n) => kindle(x, n), { undo: true }) !== false) toast('Kindled an ember token.', 'good', true); }}>
          Kindle ember <small>{KINDLE_COST} mana</small>
        </button>
      </div>
      <p class="dim pack">Pack: {Object.entries(s.materials).filter(([, v]) => v > 0).map(([k, v]) => `${MATERIALS[k as keyof typeof MATERIALS].name} ×${v}`).join(', ') || 'empty for now. Keeps sometimes drop forge materials.'}</p>
    </div>
  );
}

export function HallTab({ s }: { s: Save }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const now = Date.now();
  return (
    <div class="tab hall-tab">
      <HeroStrip s={s} />
      <Bars s={s} />
      <Dawn s={s} />
      <NextOath s={s} now={now} />
      <TodayList s={s} now={now} />
      <MindCard s={s} now={now} />
      <Quest s={s} />
      <Focus s={s} now={now} />
      <Hearth s={s} />
    </div>
  );
}

export function TravelSheet({ s, onClose }: { s: Save; onClose: () => void }) {
  return (
    <Sheet title="Travel" onClose={onClose}>
      <p class="hint">The hall shows where you are. New roads open as you level{s.quest ? '; while on a quest you walk where your foe is' : ''}.</p>
      <div class="travel">
        {LOCATIONS.map((l) => {
          const locked = s.hero.level < l.level;
          const here = s.settings.location === l.id;
          return (
            <button key={l.id} class={here ? 'pick on' : 'pick'} disabled={locked || !!s.quest} onClick={() => { act('Travel', (x) => { x.settings.location = l.id; }); onClose(); }}>
              <PlaceThumb id={l.id} />
              <b>{l.name}</b><span>{here ? 'You are here' : locked ? `Opens at level ${l.level}` : 'Go'}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
function PlaceThumb({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const pl = PLACES[id];
    Promise.all(pl.layers.map((l) => loadImage('bg/' + l.key + '.png'))).then((ims) => {
      const c = ref.current; if (!c) return;
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      for (const im of ims) for (let x = 0; x < 200; x += im.width) g.drawImage(im, x, 0);
    });
  }, [id]);
  return <canvas ref={ref} width={200} height={160} class="thumb" aria-hidden="true" />;
}
