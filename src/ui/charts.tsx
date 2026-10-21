// Small hand-drawn SVG charts (no chart library): bars, a line, and a foe timeline.
import type { ComponentChildren } from 'preact';

export function BarChart({ data, h = 96, color = 'var(--gold)', label, mark }: { data: { k: string; v: number; tag?: string; dim?: boolean }[]; h?: number; color?: string; label: string; mark?: number }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  const W = 300, bw = W / Math.max(1, data.length);
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${h + 16}`} role="img" aria-label={label} preserveAspectRatio="none">
      {[0.5, 1].map((f) => <line key={f} x1={0} x2={W} y1={h - h * f + 0.5} y2={h - h * f + 0.5} class="grid" />)}
      {data.map((d, i) => {
        const bh = Math.round((d.v / max) * (h - 4));
        const hh = d.dim ? Math.max(bh, 6) : Math.max(bh, d.v > 0 ? 2 : 0);
        return <rect key={d.k} x={i * bw + bw * 0.15} y={h - hh} width={bw * 0.7} height={hh} rx={1} fill={d.dim ? 'var(--faint)' : color} />;
      })}
      {mark != null && <rect x={mark * bw + bw * 0.15} y={h + 3} width={bw * 0.7} height={2} fill="var(--ink)" />}
      {data.map((d, i) => (d.tag ? <text key={'t' + d.k} x={i * bw + bw / 2} y={h + 14} text-anchor="middle" class="axis">{d.tag}</text> : null))}
    </svg>
  );
}

export function LineChart({ pts, h = 96, label, color = 'var(--xp)', tags }: { pts: number[]; h?: number; label: string; color?: string; tags?: { i: number; t: string }[] }) {
  const W = 300;
  const max = Math.max(1, ...pts), min = Math.min(...pts, 0);
  const x = (i: number) => (pts.length < 2 ? W / 2 : (i / (pts.length - 1)) * (W - 4) + 2);
  const y = (v: number) => h - 4 - ((v - min) / Math.max(1, max - min)) * (h - 10);
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${h + 16}`} role="img" aria-label={label} preserveAspectRatio="none">
      {[0.5, 1].map((f) => <line key={f} x1={0} x2={W} y1={h - h * f + 0.5} y2={h - h * f + 0.5} class="grid" />)}
      {pts.length > 1 && <path d={`${d} L${x(pts.length - 1)},${h} L${x(0)},${h} Z`} fill={color} opacity={0.18} />}
      <path d={d} fill="none" stroke={color} stroke-width={2.2} stroke-linejoin="round" vector-effect="non-scaling-stroke" />
      {(tags || []).map((t) => <text key={t.i} x={x(t.i)} y={h + 14} text-anchor="middle" class="axis">{t.t}</text>)}
    </svg>
  );
}

export function HBars({ rows }: { rows: { label: string; v: number; best: number; note?: ComponentChildren }[] }) {
  const max = Math.max(7, ...rows.map((r) => r.best));
  return (
    <div class="hbars">
      {rows.map((r) => (
        <div class="hbar" key={r.label}>
          <span class="l">{r.label}</span>
          <div class="track" aria-label={`${r.label}: streak ${r.v}, best ${r.best}`}>
            <i class="best" style={{ width: `${(100 * r.best) / max}%` }} />
            <i class="now" style={{ width: `${(100 * r.v) / max}%` }} />
          </div>
          <span class="n">{r.v}{r.best > r.v ? <small> / {r.best}</small> : null}</span>
        </div>
      ))}
    </div>
  );
}
