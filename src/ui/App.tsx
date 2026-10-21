import { useEffect, useRef, useState } from 'preact/hooks';
import { clearToasts, dropToast, getSheet, init, isAdding, openSheet, switchHero, takeLoadNote, takeTab, tick, toast, undo, useSave, useToasts, getFamily, onChange } from './store';
import { Create } from './Create';
import { HallTab, TravelSheet } from './HallTab';
import { OathsTab } from './OathsTab';
import { MarketTab } from './MarketTab';
import { HeroTab, importFile } from './HeroTab';
import { HallView } from './HallView';
import { JourneyTab, setJourneySeg } from './Journey';
import { KidView } from './Kid';
import { FamilySheet } from './Family';
import { RestSheet } from './HallExtras';
import { Icon } from './icons';
import { initAudio } from './audio';
import { planReminders } from './reminders';
import { refreshBadge } from './badge';
import { usePhase } from './phase';
import { canClaim } from '../engine/story';

type Tab = 'hall' | 'oaths' | 'journey' | 'market' | 'hero';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hall', label: 'Hall', icon: 'flame' },
  { id: 'oaths', label: 'Oaths', icon: 'scroll' },
  { id: 'journey', label: 'Journey', icon: 'book' },
  { id: 'market', label: 'Market', icon: 'coin' },
  { id: 'hero', label: 'Hero', icon: 'sword' },
];

// ?hero= (from a reminder) picks the hero before anything loads
const q = new URLSearchParams(location.search);
init();
if (q.get('hero') && getFamily().members.some((m) => m.id === q.get('hero'))) switchHero(q.get('hero')!);
initAudio();

function scrollToCard(sel: string) {
  setTimeout(() => { const el = document.querySelector(sel); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el?.querySelector('button.keep, button.primary, button.win, button.secondary') as HTMLElement | null)?.focus({ preventScroll: true }); }, 350);
}

export function App() {
  const s = useSave();
  const toasts = useToasts();
  const [tab, setTab] = useState<Tab>('hall');
  const [travel, setTravel] = useState(false);
  const [grown, setGrown] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  usePhase();
  const sheet = getSheet();
  const adding = isAdding();

  useEffect(() => {
    const n = takeLoadNote(); if (n) toast(n, 'info', false, 7000);
    const id = setInterval(tick, 30_000);
    const vis = () => { if (document.visibilityState === 'visible') { tick(); refreshBadge(); } };
    document.addEventListener('visibilitychange', vis);
    // app shortcuts and reminder taps: ?action=next|focus|tiny|week
    const act = q.get('action');
    if (act) {
      history.replaceState(null, '', location.pathname);
      if (act === 'week') { setJourneySeg('week'); setTab('journey'); }
      else if (act === 'focus') scrollToCard('.card.focus');
      else if (act === 'tiny') scrollToCard('.card.tiny, .card.next');
      else scrollToCard('.card.next, .kid-grid');
    }
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'open') { const u = new URL(e.data.url); const h = u.searchParams.get('hero'); if (h) switchHero(h); setTab('hall'); scrollToCard('.card.next, .kid-grid'); } };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    planReminders(); refreshBadge();
    const off = onChange(() => { const t = takeTab(); if (t) setTab(t as Tab); });
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); navigator.serviceWorker?.removeEventListener('message', onMsg); off(); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); clearToasts(); }, [tab]);
  useEffect(() => { setGrown(false); setTab('hall'); planReminders(); refreshBadge(); }, [getFamily().active]);

  const kid = s?.mode === 'kid' && !grown;
  return (
    <div class={`app ${kid ? 'kid-mode' : ''}`}>
      {!s || adding ? (
        <Create adding={adding} onDone={() => { setTab('hall'); window.scrollTo(0, 0); planReminders(); }} onImport={() => file.current?.click()} />
      ) : (
        <>
          <header class={tab === 'hall' || kid ? 'stage-top' : 'stage-top off'}>
            <HallView s={s} active={tab === 'hall' || kid} onTravel={() => setTravel(true)} />
          </header>
          {kid ? (
            <main class="main kid-main" id="main"><KidView s={s} onGrownUp={() => setGrown(true)} /></main>
          ) : (
            <>
              <main class="main" id="main">
                {s.mode === 'kid' && <div class="grown-bar"><span>Grown-up menus for {s.hero.name}</span><button class="secondary small" onClick={() => setGrown(false)}>Back to {s.hero.name}'s view</button></div>}
                {tab === 'hall' && <HallTab s={s} />}
                {tab === 'oaths' && <OathsTab s={s} />}
                {tab === 'journey' && <JourneyTab s={s} />}
                {tab === 'market' && <MarketTab s={s} />}
                {tab === 'hero' && <HeroTab s={s} />}
              </main>
              <nav class="tabs" aria-label="Sections">
                {TABS.map((t) => (
                  <button key={t.id} class={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                    <Icon name={t.icon} size={20} /><span>{t.label}</span>
                    {t.id === 'hero' && s.hero.skillPoints > 0 && <i class="dot" aria-label="skill point to spend" />}
                    {t.id === 'journey' && canClaim(s) && <i class="dot" aria-label="a chapter reward to claim" />}
                  </button>
                ))}
              </nav>
            </>
          )}
          {travel && <TravelSheet s={s} onClose={() => setTravel(false)} />}
          {sheet === 'family' && <FamilySheet onClose={() => openSheet(null)} />}
          {sheet === 'rest' && <RestSheet s={s} onClose={() => openSheet(null)} />}
        </>
      )}
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e)} />
      <div class="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} class={`toast ${t.kind || 'info'}`}>
            <span>{t.text}</span>
            {t.undo && <button class="link" onClick={() => undo()}>Undo</button>}
            {t.action && <button class="link" onClick={() => { dropToast(t.id); t.action!.run(); }}>{t.action.label}</button>}
            <button class="x" aria-label="Dismiss" onClick={() => dropToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
