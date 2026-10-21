import { useEffect, useState } from 'preact/hooks';
import { CHAPTERS, canClaim, claimChapter, currentChapter, goalStates, isOpen, rewardLine } from '../engine/story';
import { SPARKS, TRACK, daysLeft, rewardText, themeOf } from '../engine/season';
import { BADGES } from '../engine/achievements';
import { GRADE_INFO, lastWeekOf, weekReport, type WeekReport } from '../engine/report';
import { addDays, type DayKey } from '../engine/time';
import { today } from '../engine/rules';
import type { Save } from '../engine/types';
import { act, toast } from './store';
import { Icon } from './icons';
import { Seg } from './Sheet';
import { HeroStrip } from './HallTab';
import { BarChart, HBars, LineChart } from './charts';
import { extras } from './actions';
import { sfx } from './audio';

export type JourneySeg = 'story' | 'season' | 'badges' | 'stats' | 'week';
let lastSeg: JourneySeg = 'story';
export function setJourneySeg(s: JourneySeg) { lastSeg = s; }

export function JourneyTab({ s }: { s: Save }) {
  const [seg, setSeg] = useState<JourneySeg>(lastSeg);
  useEffect(() => { lastSeg = seg; window.scrollTo(0, 0); }, [seg]);
  return (
    <div class="tab journey">
      <HeroStrip s={s} />
      <Seg label="Journey" value={seg} onChange={setSeg} options={[{ id: 'story', label: 'Story' }, { id: 'season', label: 'Season' }, { id: 'badges', label: 'Badges' }, { id: 'stats', label: 'Stats' }, { id: 'week', label: 'Week' }]} />
      {seg === 'story' && <Story s={s} />}
      {seg === 'season' && <Season s={s} />}
      {seg === 'badges' && <Badges s={s} />}
      {seg === 'stats' && <Stats s={s} />}
      {seg === 'week' && <Week s={s} />}
    </div>
  );
}

// ------------------------------------------------------------ story
export function claim() {
  const r = act('Claim chapter', (x, n) => claimChapter(x, n));
  if (!r) return;
  sfx.level();
  toast(`Chapter ${r.chapter.n} complete: ${rewardLine(r.chapter.reward)}`, 'good', false, 6000);
  if (r.levels) setTimeout(() => toast('Level up!', 'good'), 500);
  extras({}, 0);
}
function Story({ s }: { s: Save }) {
  const cur = currentChapter(s);
  const ready = canClaim(s);
  return (
    <div class="story">
      <p class="hint">The Cold Hearth: a short tale in {CHAPTERS.length} chapters. Each one opens at a level and asks for things you already do. Progress counts from when a chapter opens.</p>
      {[...CHAPTERS].sort((a, b) => (s.story.claimed.includes(a.n) ? 1 : 0) - (s.story.claimed.includes(b.n) ? 1 : 0) || a.n - b.n).map((c, i, arr) => {
        const done = s.story.claimed.includes(c.n);
        const isCur = cur?.n === c.n;
        const open = isOpen(s, c);
        if (!done && !isCur) return (
          <div class="card chapter locked" key={c.n}><div class="kicker">Chapter {c.n} <span class="count">opens at level {c.level}</span></div><b>{c.title}</b></div>
        );
        const firstDone = done && (i === 0 || !s.story.claimed.includes(arr[i - 1].n));
        return (
          <>{firstDone && <h3 key={'h' + c.n}>Told so far</h3>}
          <div class={`card chapter ${done ? 'done' : 'cur'}`} key={c.n}>
            <div class="kicker">Chapter {c.n} {done ? <span class="tag">complete</span> : !open ? <span class="count">opens at level {c.level}</span> : null}</div>
            <h3 class="ch-title">{c.title}</h3>
            <p>{done ? c.done : c.text}</p>
            {!done && open && (
              <ul class="goals">
                {goalStates(s, c).map((g) => (
                  <li key={g.text} class={g.done ? 'done' : ''}>
                    <span class="gtick" aria-hidden="true">{g.done ? '✓' : ''}</span>
                    <span class="gt">{g.text}</span>
                    <span class="gn">{g.have}/{g.need}</span>
                  </li>
                ))}
              </ul>
            )}
            {!done && <p class="dim small">Reward: {rewardLine(c.reward)}</p>}
            {!done && ready?.n === c.n && <button class="primary wide" onClick={claim}>Claim the reward</button>}
            {!done && !open && <p class="dim small">Reach level {c.level} to begin (you are level {s.hero.level}).</p>}
          </div></>
        );
      })}
      {!cur && <div class="card"><b>The tale is told.</b> <span class="dim">The hearth is restored. More chapters may come in a later update.</span></div>}
    </div>
  );
}

// ------------------------------------------------------------ season
function Season({ s }: { s: Save }) {
  const th = themeOf(s.season.id);
  const d = today(s, Date.now());
  const left = daysLeft(d);
  const nextT = TRACK.findIndex((_, i) => !s.season.got.includes(i));
  const goal = nextT >= 0 ? TRACK[nextT].at : TRACK[TRACK.length - 1].at;
  const month = new Date(Number(s.season.id.slice(0, 4)), Number(s.season.id.slice(5, 7)) - 1, 1).toLocaleString(undefined, { month: 'long' });
  return (
    <div class="season">
      <div class="card season-head" style={{ '--acc': th.accent } as any}>
        <div class="kicker">{month} season <span class="count">{left} day{left === 1 ? '' : 's'} left</span></div>
        <h3 class="ch-title">{th.name}</h3>
        <p class="dim">{th.blurb}</p>
        <div class="spark-row"><Icon name="star" size={14} /> <b>{s.season.sparks}</b> sparks{nextT >= 0 ? <span class="dim"> · next reward at {goal}</span> : <span class="good"> · track complete</span>}</div>
        <div class="bar season"><i style={{ width: `${Math.min(100, (100 * s.season.sparks) / TRACK[TRACK.length - 1].at)}%` }} /></div>
        <p class="hint">Free for everyone, earned only by playing: daily +{SPARKS.daily}, errand +{SPARKS.todo}, habit +{SPARKS.habit}, big-task step +{SPARKS.chore}, 15 focus minutes +{SPARKS.focus15}, a clean day +{SPARKS.perfect}, a foe beaten +{SPARKS.boss}. Rewards are given the moment you reach them. A new season starts on the 1st; what you earned stays yours.</p>
      </div>
      <ol class="track">
        {TRACK.map((t, i) => {
          const got = s.season.got.includes(i);
          return (
            <li key={i} class={got ? 'got' : s.season.sparks >= t.at ? 'got' : ''}>
              <span class="tn">{got ? '✓' : i + 1}</span>
              <span class="tr">{rewardText(t.reward, s.season.id)}</span>
              <span class="ta">{t.at}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ------------------------------------------------------------ badges
function Badges({ s }: { s: Save }) {
  const have = BADGES.filter((b) => s.achievements[b.id]).length;
  return (
    <div class="badges">
      <p class="hint">{have} of {BADGES.length} earned. Badges are for the record; they never cost or take anything.</p>
      <div class="badge-grid">
        {BADGES.map((b) => {
          const at = s.achievements[b.id];
          return (
            <div key={b.id} class={`bdg ${b.tier} ${at ? 'on' : 'off'}`} aria-label={`${b.name}: ${b.text}${at ? ', earned' : ', not yet'}`}>
              <span class="bi"><Icon name={b.icon} size={26} /></span>
              <b>{b.name}</b>
              <span>{b.text}</span>
              {at ? <em>{new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</em> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ stats
const short = (d: DayKey) => { const x = new Date(d + 'T12:00:00'); return `${x.getDate()}/${x.getMonth() + 1}`; };
function Stats({ s }: { s: Save }) {
  const d = today(s, Date.now());
  const days = Array.from({ length: 28 }, (_, i) => addDays(d, i - 27));
  const keeps = days.map((k, i) => ({ k, v: s.history[k]?.keeps ?? 0, dim: !!s.history[k]?.paused, tag: i % 7 === 6 || i === 0 ? short(k) : undefined }));
  const total = keeps.reduce((a, x) => a + x.v, 0);
  const span = Array.from({ length: 60 }, (_, i) => addDays(d, i - 59));
  const after = span.reduce((a, k) => a + (s.history[k]?.xp ?? 0), 0);
  let run = Math.max(0, s.stats.xpTotal - after);
  const xpPts = span.map((k) => (run += s.history[k]?.xp ?? 0));
  const dailies = s.oaths.filter((o) => o.kind === 'daily').sort((a, b) => b.streak - a.streak || b.bestStreak - a.bestStreak);
  const best = Math.max(0, ...s.oaths.map((o) => o.bestStreak));
  return (
    <div class="stats-tab">
      <div class="card">
        <div class="kicker">Streaks <span class="count">best ever {best}</span></div>
        {dailies.length ? <HBars rows={dailies.slice(0, 8).map((o) => ({ label: o.title, v: o.streak, best: o.bestStreak }))} /> : <p class="dim">No dailies yet.</p>}
        <p class="hint">Bright bar: the streak now. Faint bar: the best it has been.</p>
      </div>
      <div class="card">
        <div class="kicker">Keeps per day <span class="count">{total} in 4 weeks</span></div>
        <BarChart data={keeps} label={`Keeps per day for the last 28 days, ${total} in total`} mark={27} />
        <p class="hint">Grey days were rest days.</p>
      </div>
      <div class="card">
        <div class="kicker">Experience over time <span class="count">{s.stats.xpTotal} XP all-time</span></div>
        <LineChart pts={xpPts} label={`Total experience over 60 days, now ${s.stats.xpTotal}`} tags={[{ i: 0, t: short(span[0]) }, { i: 30, t: short(span[30]) }, { i: 59, t: 'today' }]} />
      </div>
      <div class="card">
        <div class="kicker">Foes <span class="count">{s.stats.bossesDown} beaten</span></div>
        <BossHistory s={s} />
      </div>
      <div class="card">
        <div class="kicker">All-time</div>
        <div class="record">
          <span><b>{s.stats.keeps}</b> keeps</span><span><b>{s.stats.dailyKeeps}</b> dailies</span><span><b>{s.stats.todos}</b> errands</span>
          <span><b>{s.stats.perfectDays}</b> clean days</span><span><b>{s.stats.focusMinutes}</b> focus min</span><span><b>{s.stats.choreBosses}</b> big tasks</span>
          <span><b>{s.stats.goldTotal}</b> gold earned</span><span><b>{s.stats.restDays}</b> rest days</span>
        </div>
      </div>
    </div>
  );
}
function BossHistory({ s }: { s: Save }) {
  const log = s.bossLog.slice(-8);
  if (!log.length) return <p class="dim">No foes faced yet. Pick one on the Hall.</p>;
  const d = today(s, Date.now());
  const first = log[0].start || d;
  const span = Math.max(7, (new Date(d).getTime() - new Date(first).getTime()) / 86400000 + 1);
  const pos = (k: DayKey) => ((new Date(k).getTime() - new Date(first).getTime()) / 86400000 / span) * 100;
  return (
    <div class="gantt" role="list">
      {log.map((b, i) => {
        const end = b.end || d;
        const days = Math.round((new Date(end).getTime() - new Date(b.start || end).getTime()) / 86400000) + 1;
        return (
          <div class="g-row" role="listitem" key={i}>
            <span class="g-name">{b.name.replace(/^The /, '')}</span>
            <div class="g-track"><i class={b.won ? 'won' : b.end ? 'left' : 'now'} style={{ left: `${pos(b.start || end)}%`, width: `${Math.max(3, (days / span) * 100)}%` }} /></div>
            <span class="g-n">{b.won ? `${days}d ✓` : b.end ? 'turned back' : `${days}d…`}</span>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ week
export function WeekView({ r, kid }: { r: WeekReport; kid?: boolean }) {
  const gi = GRADE_INFO[r.grade];
  const name = (k: DayKey) => new Date(k + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' });
  return (
    <div class="week">
      <div class="grade-box">
        <div class="flames" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <span key={i} class={i < gi.flames ? 'on' : ''}><Icon name="flame" size={22} /></span>)}</div>
        <b class="grade">{gi.name}</b>
        <span class="dim">{r.due ? `${r.kept} of ${r.due} dailies kept` : `${r.keeps} tiny wins on ${r.days.filter((x) => x.keeps > 0).length} days`}{r.rested ? ` · ${r.rested} rest day${r.rested > 1 ? 's' : ''}` : ''}</span>
      </div>
      <p class="msg">{r.message}</p>
      <div class="weekdays">
        {r.days.map((x) => (
          <div key={x.day} class={`wd ${x.paused ? 'rest' : x.perfect ? 'perfect' : x.kept ? 'some' : ''}`} title={x.day}>
            <span>{name(x.day).slice(0, 1)}</span>
            <i style={{ height: `${Math.min(100, 12 + x.keeps * 12)}%` }} />
            <small>{x.paused ? 'rest' : x.keeps}</small>
          </div>
        ))}
      </div>
      <ul class="week-facts">
        {r.best && <li><b>Best day:</b> {name(r.best.day)}, with {r.best.keeps} keeps{r.best.perfect ? ' (every daily)' : ''}.</li>}
        {r.more ? <li><b>{r.more} more keeps</b> than the week before.</li> : null}
        {r.strong.length > 0 && <li><b>Rock solid:</b> {r.strong.map((o) => o.title).join(', ')}.</li>}
        {r.foes.length > 0 && <li><b>Foes beaten:</b> {r.foes.join(', ')}.</li>}
        {r.chores.length > 0 && <li><b>Big tasks done:</b> {r.chores.join(', ')}.</li>}
        {!kid && r.focus > 0 && <li><b>{r.focus} minutes</b> of focus.</li>}
        {!kid && <li>{r.keeps} keeps · {r.xp} XP · {r.gold} gold.</li>}
      </ul>
      {r.slipped.length > 0 && (
        <div class="slipped">
          <b>Worth a look</b>
          <p class="dim small">These were hard to fit in. Maybe make one smaller, or move it to fewer days. Nothing is lost.</p>
          <ul>{r.slipped.map((o) => <li key={o.id}>{o.title}: {o.kept} of {o.due}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
function Week({ s }: { s: Save }) {
  const d = today(s, Date.now());
  const last = lastWeekOf(d), cur = addDays(last, 7);
  const [which, setWhich] = useState<'last' | 'this'>('last');
  const r = weekReport(s, which === 'last' ? last : cur);
  useEffect(() => { if (s.reportSeen !== last) act('Read report', (x) => { x.reportSeen = last; }); }, [last]);
  const fmt = (k: DayKey) => new Date(k + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <div class="card">
      <div class="kicker">Report card <span class="count">{fmt(r.week)} – {fmt(r.end)}</span></div>
      <div class="pills">
        <button class={which === 'last' ? 'pill on' : 'pill'} onClick={() => setWhich('last')}>Last week</button>
        <button class={which === 'this' ? 'pill on' : 'pill'} onClick={() => setWhich('this')}>This week so far</button>
      </div>
      {r.empty ? <p class="dim">Nothing recorded for this week yet. The report fills in as you play.</p> : <WeekView r={r} />}
    </div>
  );
}
