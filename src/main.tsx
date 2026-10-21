import { render } from 'preact';
import { App } from './ui/App';
import { toast } from './ui/store';
import './styles.css';

render(<App />, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // look for a new version whenever the app comes back to the front
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => { /* offline install is optional */ });
    let shown = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || shown) return; // first install: nothing to announce
      shown = true;
      toast('A new version of Hearthbound is ready.', 'info', false, 0, { label: 'Reload', run: () => location.reload() });
    });
  });
}
