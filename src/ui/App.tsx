import { useEffect, useRef, useState } from 'preact/hooks';
import { clearToasts, dropToast, init, takeLoadNote, tick, toast, undo, useSave, useToasts } from './store';
import { Create } from './Create';
import { HallTab, TravelSheet } from './HallTab';
import { OathsTab } from './OathsTab';
import { MarketTab } from './MarketTab';
import { HeroTab, importFile } from './HeroTab';
import { HallView } from './HallView';
import { Icon } from './icons';

type Tab = 'hall' | 'oaths' | 'market' | 'hero';
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'hall', label: 'Hall', icon: 'flame' },
  { id: 'oaths', label: 'Oaths', icon: 'scroll' },
  { id: 'market', label: 'Market', icon: 'coin' },
  { id: 'hero', label: 'Hero', icon: 'sword' },
];

init();

export function App() {
  const s = useSave();
  const toasts = useToasts();
  const [tab, setTab] = useState<Tab>('hall');
  const [travel, setTravel] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const n = takeLoadNote(); if (n) toast(n, 'info', false, 7000);
    const id = setInterval(tick, 30_000);
    const vis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); clearToasts(); }, [tab]);

  return (
    <div class="app">
      {!s ? (
        <Create onDone={() => { setTab('hall'); window.scrollTo(0, 0); }} onImport={() => file.current?.click()} />
      ) : (
        <>
          <header class={tab === "hall" ? "stage-top" : "stage-top off"}>
            <HallView s={s} active={tab === 'hall'} onTravel={() => setTravel(true)} />
          </header>
          <main class="main" id="main">
            {tab === 'hall' && <HallTab s={s} />}
            {tab === 'oaths' && <OathsTab s={s} />}
            {tab === 'market' && <MarketTab s={s} />}
            {tab === 'hero' && <HeroTab s={s} />}
          </main>
          <nav class="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <button key={t.id} class={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
                <Icon name={t.icon} size={20} /><span>{t.label}</span>
                {t.id === 'hero' && s.hero.skillPoints > 0 && <i class="dot" aria-label="skill point to spend" />}
              </button>
            ))}
          </nav>
          {travel && <TravelSheet s={s} onClose={() => setTravel(false)} />}
        </>
      )}
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e)} />
      <div class="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} class={`toast ${t.kind || 'info'}`}>
            <span>{t.text}</span>
            {t.undo && <button class="link" onClick={() => undo()}>Undo</button>}
            <button class="x" aria-label="Dismiss" onClick={() => dropToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
