import { MODE_NAMES } from '../engine/family';
import { getFamily, openSheet, removeHero, setAdding, switchHero, toast } from './store';
import { Sheet } from './Sheet';

const AVATAR: Record<string, string> = { standard: '⚔️', gentle: '🌿', kid: '⭐' };

export function FamilySheet({ onClose }: { onClose: () => void }) {
  const f = getFamily();
  return (
    <Sheet title="Who's playing?" onClose={onClose}>
      <p class="hint">Every hero on this phone keeps separate oaths, gold, familiars and story.</p>
      <div class="family">
        {f.members.map((m) => (
          <div class={`member ${m.id === f.active ? 'on' : ''}`} key={m.id}>
            <button class="pickm" onClick={() => { switchHero(m.id); onClose(); toast(`Hello, ${m.name}.`, 'good'); }} aria-current={m.id === f.active}>
              <span class="av" aria-hidden="true">{AVATAR[m.mode]}</span>
              <span class="mt"><b>{m.name}</b><small>{MODE_NAMES[m.mode].name} · level {m.level}</small></span>
              {m.id === f.active && <em>playing</em>}
            </button>
            {f.members.length > 1 && m.id !== f.active && (
              <button class="ghost small" aria-label={`Remove ${m.name}`} onClick={() => { if (confirm(`Remove ${m.name} from this phone? Make a family backup first if you might want them back.`)) { try { removeHero(m.id); } catch (e) { toast((e as Error).message, 'bad'); } } }}>Remove</button>
            )}
          </div>
        ))}
      </div>
      <button class="primary wide" onClick={() => { onClose(); setAdding(true); }}>+ Add a hero</button>
    </Sheet>
  );
}
export const openFamily = () => openSheet('family');
