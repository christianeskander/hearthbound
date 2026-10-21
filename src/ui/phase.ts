import { useEffect, useState } from 'preact/hooks';
import { phaseOf, type Phase } from '../engine/phase';

/** The time of day, following the phone's clock. The body gets a phase-* class for the UI colours. */
export function currentPhase(d = new Date()): Phase {
  const q = new URLSearchParams(location.search).get('phase') as Phase | null; // for screenshots
  return q && ['dawn', 'day', 'dusk', 'night'].includes(q) ? q : phaseOf(d.getHours());
}
export function applyPhaseClass(p: Phase) {
  const b = document.body;
  for (const x of ['dawn', 'day', 'dusk', 'night']) b.classList.toggle('phase-' + x, x === p);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', p === 'day' ? '#1d1612' : p === 'night' ? '#0f1020' : p === 'dusk' ? '#24141a' : '#22161a');
}
export function usePhase(): Phase {
  const [p, set] = useState<Phase>(currentPhase());
  useEffect(() => {
    const f = () => set(currentPhase());
    const t = setInterval(f, 60_000);
    document.addEventListener('visibilitychange', f);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', f); };
  }, []);
  useEffect(() => applyPhaseClass(p), [p]);
  return p;
}
