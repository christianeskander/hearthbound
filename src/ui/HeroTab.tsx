import { useEffect, useRef, useState } from 'preact/hooks';
import { CALLINGS, GEAR, PERKS, STATS, STAT_IDS, familiarById } from '../engine/content';
import { canLearn, equip, learnPerk, maxHp, mods, statRank } from '../engine/rules';
import { exportFamily, exportSave, importBundle } from '../engine/save';
import type { Save, Slot } from '../engine/types';
import { HAIRS, HAIR_COLORS, SKINS, SKIN_NAMES } from '../art/look';
import { RAMPS } from '../art/palettes';
import { act, allHeroes, getFamily, openSheet, replaceSave, restoreFamily, toast } from './store';
import { getPrefs, onPrefs, setPrefs } from './prefs';
import { askPermission, googleCalLink, icsFile, isIOS, isStandalone, periodicSyncSupported, permission, planReminders, testReminder, triggersSupported } from './reminders';
import { badgeSupported, refreshBadge } from './badge';
import { stageOf, nextStage, bondOf } from '../engine/pets';
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
        <p class="dim">{calling.perk}. {fam.gift}{stageOf(s, h.familiar).gift > 1 ? ` (×${stageOf(s, h.familiar).gift} at ${stageOf(s, h.familiar).name})` : ''}.</p>
        <FamiliarGrowth s={s} />
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

function download(file: File) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const stamp = () => new Date().toISOString().slice(0, 10);
function familyFile() {
  const heroes = allHeroes();
  return new File([exportFamily(heroes)], `hearthbound-backup-${stamp()}.json`, { type: 'application/json' });
}
const canShareFiles = (f: File) => { try { return !!navigator.canShare?.({ files: [f] }); } catch { return false; } };

function Settings({ s }: { s: Save }) {
  const file = useRef<HTMLInputElement>(null);
  const [prefs, setP] = useState(getPrefs());
  useEffect(() => onPrefs(() => setP(getPrefs())), []);
  const [perm, setPerm] = useState(permission());
  const [psync, setPsync] = useState<boolean | null>(null);
  useEffect(() => { periodicSyncSupported().then(setPsync); }, []);
  const ios = isIOS(), standalone = isStandalone();
  const backup = () => { download(familyFile()); setPrefs({ lastBackupAt: Date.now() }); toast('Backup saved. Keep it in Files, Drive or iCloud.', 'good'); };
  const share = async () => {
    const f = familyFile();
    if (!canShareFiles(f)) { download(f); toast('Sharing files is not available here, so the backup was downloaded instead.', 'info', false, 6000); return; }
    try { await navigator.share({ files: [f], title: 'Hearthbound backup', text: 'Hearthbound backup file. Open Hearthbound and use Restore to load it.' }); setPrefs({ lastBackupAt: Date.now() }); toast('Backup shared.', 'good'); }
    catch (e) { if ((e as Error).name !== 'AbortError') toast('Could not share. Try Back up instead.', 'bad'); }
  };
  const reminder = (p: Partial<Save['settings']['reminder']>) => { act('Reminder', (x) => { x.settings.reminder = { ...x.settings.reminder, ...p }; }); planReminders(); };
  const turnOn = async () => {
    let p = permission();
    if (p === 'default') p = await askPermission();
    setPerm(p);
    reminder({ on: true });
    if (p === 'granted') toast(`Reminder set for ${s.settings.reminder.time}.`, 'good');
    else toast('Notifications are not allowed here. The calendar reminder below works anywhere.', 'info', false, 6000);
  };
  const icsShare = async () => {
    const f = icsFile(s);
    if (canShareFiles(f) && ios) { try { await navigator.share({ files: [f], title: 'Hearthbound reminder' }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; } }
    download(f);
    toast(ios ? 'Calendar file saved. Tap it in Downloads (Files) and choose Add to Calendar.' : 'Calendar file saved. Open it to add the daily reminder.', 'good', false, 7000);
  };
  const last = prefs.lastBackupAt ? new Date(prefs.lastBackupAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'never';
  const fam = getFamily();
  return (
    <>
      <div class="card">
        <div class="kicker">Family <span class="count">{fam.members.length} hero{fam.members.length === 1 ? '' : 'es'}</span></div>
        <p class="dim small">{fam.members.map((m) => m.name).join(' · ')}</p>
        <div class="row"><button class="secondary" onClick={() => openSheet('family')}>Switch or add a hero</button></div>
      </div>

      <div class="card">
        <div class="kicker">Sound</div>
        <label class="check"><input type="checkbox" checked={!prefs.muted} onChange={(e) => setPrefs({ muted: !(e.target as HTMLInputElement).checked })} /> Sound on</label>
        <label class="field">Effects volume<input type="range" min={0} max={1} step={0.05} value={prefs.sfx} onInput={(e) => setPrefs({ sfx: Number((e.target as HTMLInputElement).value) })} /></label>
        <label class="check"><input type="checkbox" checked={prefs.musicOn} onChange={(e) => setPrefs({ musicOn: (e.target as HTMLInputElement).checked })} /> Calm music</label>
        <label class="field">Music volume<input type="range" min={0} max={1} step={0.05} value={prefs.music} disabled={!prefs.musicOn} onInput={(e) => setPrefs({ music: Number((e.target as HTMLInputElement).value) })} /></label>
        <p class="hint">All sound is made on the phone (no files). Music starts after your first tap and pauses when the app is in the background. The 🔊 chip on the Hall mutes everything.</p>
      </div>

      <div class="card">
        <div class="kicker">Daily reminder</div>
        <div class="row">
          <label class="field inline">Time<input type="time" value={s.settings.reminder.time} onChange={(e) => reminder({ time: (e.target as HTMLInputElement).value || '19:00' })} /></label>
          {s.settings.reminder.on ? <button class="secondary" onClick={() => reminder({ on: false })}>Turn off</button> : <button class="primary" onClick={turnOn}>Turn on</button>}
        </div>
        <p class="small">Status: {perm === 'unsupported' ? (ios && !standalone ? 'notifications need the app on your Home Screen first (Share → Add to Home Screen).' : 'this browser cannot show notifications.') : perm === 'granted' ? (s.settings.reminder.on ? `on, at ${s.settings.reminder.time}.` : 'allowed, but off.') : perm === 'denied' ? 'notifications are blocked in your settings.' : 'not asked yet.'}</p>
        {perm === 'granted' && <button class="link" onClick={() => testReminder()}>Send a test reminder</button>}
        <p class="hint">Honest note: a web app cannot wake itself up on a schedule. The reminder above fires while Hearthbound is open or recently used{psync ? '; this browser also lets it check in now and then in the background (timing is up to the browser)' : ''}{triggersSupported() ? '; this browser can also schedule it ahead' : ''}. For a reminder that always fires, even with the app closed, add it to your calendar:</p>
        <div class="row">
          <button class="secondary" onClick={icsShare}>Add to calendar (.ics)</button>
          <a class="secondary btnlink" href={googleCalLink(s)} target="_blank" rel="noopener">Google Calendar</a>
        </div>
      </div>

      <div class="card">
        <div class="kicker">App icon badge</div>
        <div class="pills">
          {(['dailies', 'streak', 'off'] as const).map((m) => <button key={m} class={prefs.badge === m ? 'pill on' : 'pill'} aria-pressed={prefs.badge === m} onClick={() => { setPrefs({ badge: m }); refreshBadge(); }}>{m === 'dailies' ? 'Dailies left' : m === 'streak' ? 'Streak' : 'Off'}</button>)}
        </div>
        <p class="hint">{badgeSupported() ? (ios ? 'Shows on the Home Screen icon once notifications are allowed.' : 'Shows on the installed app icon.') : 'This browser does not support icon badges (Android Chrome does not; iPhone needs the Home Screen app with notifications allowed).'}</p>
      </div>

      <div class="card">
        <div class="kicker">Backup <span class="count">last: {last}</span></div>
        <p class="hint">Everything lives only on this phone. A backup is one small file with every hero in it. Save it to Files, iCloud Drive or Google Drive, or send it to yourself. No account, nothing uploaded by us.</p>
        <div class="row">
          <button class="primary" onClick={backup}>Back up</button>
          <button class="secondary" onClick={share}>Share…</button>
          <button class="secondary" onClick={() => file.current?.click()}>Restore</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e, s.hero.name)} />
        </div>
        <button class="link" onClick={() => { const f = new File([exportSave(s)], `hearthbound-${s.hero.name.replace(/\W+/g, '-').toLowerCase()}-${stamp()}.json`, { type: 'application/json' }); download(f); }}>Back up only {s.hero.name}</button>
      </div>

      <div class="card">
        <div class="kicker">Game</div>
        <label class="field">The day turns at
          <select value={s.settings.dayStart} onChange={(e) => act('Day turn', (x) => { x.settings.dayStart = Number((e.target as HTMLSelectElement).value); })}>
            {[0, 1, 2, 3, 4, 5, 6].map((hh) => <option key={hh} value={hh}>{hh === 0 ? 'Midnight' : `${hh}:00am`}</option>)}
          </select>
        </label>
        {s.mode !== 'kid' && <label class="check"><input type="checkbox" checked={s.settings.noPenalty} onChange={(e) => act('Gentle mode', (x) => { x.settings.noPenalty = (e.target as HTMLInputElement).checked; })} /> Gentle mode: misses and slips never cost anything</label>}
        <div class="row"><button class="secondary" onClick={() => openSheet('rest')}>Rest days (sick, away)</button></div>
        <div class="row"><button class="danger ghost small" onClick={() => { if (confirm(`Start a new life for this hero? ${s.hero.name} is replaced (a backup copy is kept). Back up first if you want them back.`)) { replaceSave(null); } }}>Start a new life</button></div>
      </div>
    </>
  );
}

export async function importFile(e: Event, current?: string) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  try {
    const b = importBundle(await f.text());
    if (b.kind === 'family') {
      const names = b.heroes.map((h) => `${h.save.hero.name} (level ${h.save.hero.level})`).join(', ');
      if (!confirm(`Restore ${b.heroes.length} hero${b.heroes.length > 1 ? 'es' : ''} from this backup: ${names}? Heroes with the same place on this phone are replaced (their old copy is kept as a backup).`)) return;
      restoreFamily(b.heroes);
      toast('Backup restored. Welcome back.', 'good');
      return;
    }
    const save = b.save;
    const ok = !current || confirm(`Replace ${current} with ${save.hero.name} (level ${save.hero.level}) from this file? The current saga is kept as the backup copy.`);
    if (ok) { replaceSave(save); toast(`Welcome back, ${save.hero.name}.`, 'good'); }
  } catch (err) {
    toast(`Could not restore: ${(err as Error).message} Nothing was changed.`, 'bad');
  }
}

function FamiliarGrowth({ s }: { s: Save }) {
  const id = s.hero.familiar, st = stageOf(s, id), nx = nextStage(s, id), b = bondOf(s, id);
  const fam = familiarById(id)!;
  return (
    <div class="growth">
      <div class="stages">{['Young', 'Grown', 'Bonded', 'Elder'].map((n, i) => <span key={n} class={i <= st.id ? 'on' : ''}>{n}</span>)}</div>
      {nx ? <><div class="bar thin"><i style={{ width: `${(100 * (b - st.at)) / (nx.at - st.at)}%` }} /></div><p class="dim small">{fam.name} is {st.name}: {st.text} {nx.at - b} more keeps (or daily pats in the hall) until {nx.name}.</p></> : <p class="dim small">{fam.name} is an Elder: {st.text}</p>}
    </div>
  );
}
