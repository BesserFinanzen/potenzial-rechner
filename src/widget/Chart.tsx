import { useEffect, useRef, useState } from 'preact/hooks';
import { SeriesPoint, eur } from '../calc/engine';

const PAD = { l: 8, r: 8, t: 12, b: 26 };

export function Chart({ series }: { series: SeriesPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  // Das Diagramm fuellt den verfuegbaren Platz: viewBox = gemessene Pixelgroesse (keine Verzerrung).
  const box = useRef<HTMLDivElement>(null);
  const [{ W, H }, setSize] = useState({ W: 640, H: 300 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width), h = Math.round(e.contentRect.height);
      if (w > 0 && h > 0) setSize((s) => (s.W === w && s.H === h ? s : { W: w, H: h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const max = Math.max(...series.map((s) => s.optimized), 1);
  const n = series.length - 1 || 1;
  const x = (i: number) => PAD.l + (i / n) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const line = (k: 'current' | 'optimized') => series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`).join(' ');
  const area = (k: 'current' | 'optimized') => `${line(k)} L${x(n)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`;
  const move = (e: PointerEvent) => {
    const r = (e.currentTarget as SVGElement).getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * n);
    setHover(Math.min(Math.max(i, 0), n));
  };
  const h = hover != null ? series[hover] : null;
  return (
    <div class="chartwrap">
      <div class="chartbox" ref={box}>
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vermögensverlauf bis zur Rente, heute versus optimiert"
        onPointerMove={move} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="gopt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g0" /><stop offset="1" class="g1" /></linearGradient>
        </defs>
        <path d={area('optimized')} fill="url(#gopt)" />
        <line x1={x(0)} x2={x(n)} y1={H - PAD.b} y2={H - PAD.b} class="c-axis" />
        <path d={line('optimized')} class="c-opt" fill="none" stroke-width="3" stroke-linejoin="round" />
        <path d={line('current')} class="c-cur" fill="none" stroke-width="2.5" stroke-dasharray="6 6" />
        <text x={x(0)} y={H - 8} class="c-txt" font-size="13">{series[0].age} J.</text>
        <text x={x(n)} y={H - 8} class="c-txt" font-size="13" text-anchor="end">{series[n].age} J.</text>
        {h && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} class="c-guide" />
            <circle cx={x(hover)} cy={y(h.optimized)} r="5.5" class="c-dot-opt" />
            <circle cx={x(hover)} cy={y(h.current)} r="4.5" class="c-dot-cur" />
          </g>
        )}
      </svg>
      </div>
      <div class="legend" aria-live="polite">
        {h ? <span>Mit {h.age} Jahren: heute {eur(h.current)} · optimiert {eur(h.optimized)}</span> : (
          <>
            <span><i class="k-cur" />So wie heute</span>
            <span><i class="k-opt" />Optimiert</span>
          </>
        )}
      </div>
    </div>
  );
}
