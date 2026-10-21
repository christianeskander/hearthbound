import { useEffect, useRef, useState } from 'preact/hooks';
import type { Hall } from '../hall/hall';
import { composeHero } from '../art/compose';
import { BOSSES, LOCATIONS, OMENS } from '../engine/content';
import { omenFor } from '../engine/rules';
import type { Save } from '../engine/types';
import { act, onFx } from './store';
import { patFamiliar, stageOf } from '../engine/pets';
import { usePhase } from './phase';
import { sfx } from './audio';
import { extras } from './actions';
import { getPrefs, onPrefs, setPrefs } from './prefs';
import { Icon } from './icons';

const LINES = [
  'One small thing, then the next.',
  'We are not behind. We are here.',
  'Later is a slime. Now is a sword.',
  'Water first. Then the world.',
  'Done is a kind of magic.',
  'Even a short walk is a walk.',
  'The fire does not mind how big the log is.',
];
const PET_LINES: Record<string, string> = {
  soot: 'Soot purrs and leans on your boot.', pip: 'Pip squeaks and scurries a circle.', inkling: 'Inkling caws, very pleased with itself.',
  bramble: 'Bramble does a little pounce.', hazel: 'Hazel wags so hard the whole hound wags.',
};

interface Float { id: number; text: string; x: number; y: number; kind: string }
let floatSeq = 0;

export function HallView({ s, active, onTravel }: { s: Save; active: boolean; onTravel: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const hall = useRef<Hall | null>(null);
  const [ready, setReady] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const lineTimer = useRef(0);
  const say = (t: string) => { setLine(t); clearTimeout(lineTimer.current); lineTimer.current = window.setTimeout(() => setLine(null), 2600); };
  const addFloat = (f: Omit<Float, 'id'>) => {
    const id = ++floatSeq;
    setFloats((x) => [...x.slice(-5), { ...f, id }]);
    setTimeout(() => setFloats((x) => x.filter((y) => y.id !== id)), 1300);
  };

  useEffect(() => {
    let dead = false;
    import('../hall/hall').then(({ createHall }) => {
      if (dead || !host.current) return;
      hall.current = createHall(host.current, host.current.clientWidth || 390, {
        tapHero: () => say(LINES[Math.floor(Math.random() * LINES.length)]),
        tapPet: () => {
          const r = act('Pat', (x, n) => patFamiliar(x, n));
          sfx.purr();
          say(r === false ? (PET_LINES[s.hero.familiar] || 'Your familiar hops.') : `${PET_LINES[s.hero.familiar] || 'Your familiar hops.'} (+1 bond today)`);
          if (r) extras({ evolved: r }, 300);
        },
        float: (text, x, y, kind) => addFloat({ text, x: x * (hall.current?.scale || 2), y: y * (hall.current?.scale || 2), kind }),
        ready: () => setReady(true),
      });
    });
    const ro = new ResizeObserver(() => { if (host.current && hall.current && host.current.clientWidth > 0) hall.current.setWidth(host.current.clientWidth); });
    if (host.current) ro.observe(host.current);
    return () => { dead = true; ro.disconnect(); hall.current?.destroy(); hall.current = null; };
  }, []);

  const lookKey = JSON.stringify([s.hero.look, s.hero.equipped]);
  useEffect(() => {
    if (!ready || !hall.current) return;
    composeHero(s.hero.look, s.hero.equipped).then((c) => hall.current?.scene.setHero(c));
  }, [ready, lookKey]);
  useEffect(() => { if (ready) hall.current?.scene.setPet(s.hero.familiar); }, [ready, s.hero.familiar]);
  const stage = stageOf(s, s.hero.familiar);
  useEffect(() => { if (ready) hall.current?.scene.setPetStage(stage.scale, stage.id >= 3 ? 2 : stage.id >= 2 ? 1 : 0); }, [ready, stage.id, s.hero.familiar]);
  const phase = usePhase();
  useEffect(() => { if (ready) hall.current?.scene.setPhase(phase); }, [ready, phase]);
  const [muted, setMuted] = useState(getPrefs().muted);
  useEffect(() => onPrefs(() => setMuted(getPrefs().muted)), []);
  useEffect(() => { if (ready) hall.current?.scene.setPlace(s.settings.location); }, [ready, s.settings.location]);
  useEffect(() => { if (ready) hall.current?.scene.setBoss(s.quest?.boss ?? null); }, [ready, s.quest?.boss]);
  useEffect(() => { hall.current?.sleep(!active); }, [active, ready]);
  useEffect(() => {
    const vis = () => hall.current?.sleep(document.hidden || !active);
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [active]);

  useEffect(() => onFx((f) => {
    const h = hall.current; if (!h) return;
    const sc = h.scale;
    const a = h.scene.heroAnchor();
    if (f.type === 'keep') {
      h.scene.keepFx(f.gold, f.strike, f.bright);
      addFloat({ text: `+${f.gold}`, x: a.x * sc + 18, y: a.y * sc - 6, kind: 'gold' });
      if (f.bright) say('A bright keep!');
      else if (f.combo > 1) say(`Combo x${f.combo}!`);
      if (f.bossDown) { h.scene.bossDown(); }
    } else if (f.type === 'evolve') {
      h.scene.evolveFx();
    } else if (f.type === 'hurt') {
      h.scene.hurtFx();
      addFloat({ text: `−${f.hp}`, x: a.x * sc, y: a.y * sc, kind: 'hurt' });
    }
  }), []);

  const loc = LOCATIONS.find((l) => l.id === s.settings.location) || LOCATIONS[0];
  const omen = OMENS.find((o) => o.id === omenFor(s.day.key).id)!;
  const boss = s.quest ? BOSSES.find((b) => b.id === s.quest!.boss) : null;
  return (
    <section class="hall" aria-label="The hall">
      <div class="hall-canvas" ref={host} />
      {!ready && <div class="hall-loading" aria-hidden="true" />}
      <div class="hall-top">
        <button class="chip" onClick={onTravel} aria-label={`Location: ${loc.name}. Travel`}>
          <Icon name="leaf" size={12} /> {loc.name}
        </button>
        {s.mode !== 'kid' && <span class="chip omen" title={omen.text}><Icon name="moon" size={12} /> {omen.name}: {omen.text}</span>}
      </div>
      <div class="hall-mute">
        <button class="chip mute" onClick={() => setPrefs({ muted: !muted })} aria-label={muted ? 'Sound is off. Turn sound on' : 'Sound is on. Mute'} aria-pressed={muted}>{muted ? '🔇' : '🔊'}</button>
      </div>
      {boss && s.quest && (
        <div class="bossbar" role="group" aria-label={`${boss.name}, ${s.quest.hp} of ${s.quest.max}`}>
          <span>{boss.name}</span>
          <div class="bar foe"><i style={{ width: `${(100 * s.quest.hp) / s.quest.max}%` }} /></div>
          <b>{s.quest.hp}</b>
        </div>
      )}
      {line && <div class="speech" role="status">{line}</div>}
      {floats.map((f) => <span key={f.id} class={`float ${f.kind}`} style={{ left: f.x + 'px', top: f.y + 'px' }}>{f.text}</span>)}
    </section>
  );
}
