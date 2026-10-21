// Parallax layers per location. All strips are 160px tall and tile on x.
// `f` is the scroll factor relative to the ground (1 = moves with the feet).
export const VIEW_H = 160;
// The LPC walk moves the planted foot back ~4px per frame, so the ground has
// to travel 32px per 8-frame cycle for the feet not to skate.
export const WALK_MS = 110;
export const STRIDE_PX = 32;
export interface Layer { key: string; f: number; drift?: number; }
export interface Place { layers: Layer[]; ground: number; tint?: number; }

export const PLACES: Record<string, Place> = {
  inn: { ground: 135, layers: [{ key: 'inn/sky', f: 0.05, drift: 2 }, { key: 'inn/town', f: 0.3 }, { key: 'inn/street', f: 1 }] },
  road: { ground: 134, layers: [{ key: 'road/back', f: 0.08 }, { key: 'road/forest', f: 0.35 }, { key: 'road/tree', f: 0.6 }, { key: 'road/ground', f: 1 }] },
  wood: { ground: 150, layers: [{ key: 'wood/back-trees', f: 0.15 }, { key: 'wood/lights', f: 0.3 }, { key: 'wood/middle-trees', f: 0.5 }, { key: 'wood/front-trees', f: 1 }] },
  coast: { ground: 134, layers: [{ key: 'coast/back', f: 0.04 }, { key: 'coast/clouds', f: 0.12, drift: 3 }, { key: 'coast/sea', f: 0.4 }, { key: 'coast/ground', f: 1 }] },
  ridge: { ground: 136, layers: [{ key: 'ridge/bg', f: 0 }, { key: 'ridge/montain-far', f: 0.1 }, { key: 'ridge/mountains', f: 0.25 }, { key: 'ridge/trees', f: 0.5 }, { key: 'ridge/ground', f: 1 }] },
};
export const ALL_LAYER_KEYS = Object.values(PLACES).flatMap((p) => p.layers.map((l) => l.key));
