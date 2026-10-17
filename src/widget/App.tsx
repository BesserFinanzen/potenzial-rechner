import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Holding, Inputs, Result, calculate, eur, validate } from '../calc/engine';
import { defaultConfig, disclaimerText } from '../calc/config';
import { Tracker } from '../tracking/client';
import { onCalendlyScheduled, scrollToCalendar, startCalendly } from '../integrations/webflow';
import { Chart } from './Chart';

const HOLDINGS: { id: Holding; label: string }[] = [
  { id: 'nothing', label: 'Noch nichts' },
  { id: 'etf', label: 'ETF' },
  { id: 'stocks', label: 'Aktien' },
  { id: 'insurance', label: 'Rente oder Lebensversicherung' },
  { id: 'building', label: 'Bausparvertrag' },
  { id: 'other', label: 'Sonstiges' },
];

type NumKey = 'age' | 'netIncome' | 'monthlySavings';
interface FieldDef { key: NumKey; label: string; short: string; unit: string; ph: string; hint: string }
const FIELDS: FieldDef[] = [
  { key: 'age', label: 'Wie alt bist du?', short: 'Alter', unit: 'Jahre', ph: 'z. B. 28', hint: 'Bitte 16 bis 66 Jahre' },
  { key: 'netIncome', label: 'Dein monatliches Nettoeinkommen in Euro', short: 'Netto', unit: '€', ph: 'z. B. 2800', hint: 'Bitte 500 bis 20.000 €' },
  { key: 'monthlySavings', label: 'Was sparst oder investierst du im Monat, in Euro?', short: 'Sparrate', unit: '€', ph: 'z. B. 300', hint: 'Bitte 0 bis 10.000 €' },
];

const toNum = (s: string) => (s ? Number(s.replace(/\D/g, '')) : undefined);
const fmt = (s: string) => (s ? Number(s).toLocaleString('de-DE') : '');

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function useCountUp(target: number): number {
  const [v, setV] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { cur.current = target; setV(target); return; }
    const from = cur.current, t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 800, 1);
      cur.current = from + (target - from) * (1 - Math.pow(1 - p, 3));
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

interface FieldProps { f: FieldDef; compact: boolean; value: string; error: boolean; onChange: (v: string) => void; onBlur: () => void; onEnter: () => void }
function Field({ f, compact, value, error, onChange, onBlur, onEnter }: FieldProps) {
  return (
    <div class="fld">
      <label for={f.key}>{compact ? f.short : f.label}</label>
      <div class={'box' + (error ? ' err' : '')}>
        <input id={f.key} inputMode="numeric" placeholder={f.ph} aria-invalid={error} value={fmt(value)}
          onInput={(e) => onChange(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
          onFocus={(e) => e.currentTarget.select()} onBlur={onBlur}
          onKeyDown={(e) => e.key === 'Enter' && onEnter()} />
        <span>{f.unit}</span>
      </div>
      <div class="hint err" role="status">{error ? f.hint : ''}</div>
    </div>
  );
}

function Chips({ holdings, error, onToggle }: { holdings: Holding[]; error: boolean; onToggle: (h: Holding) => void }) {
  return (
    <div class="fld chipsfld">
      <div class="q" id="hl">Was hast du schon?</div>
      <div class="chips" role="group" aria-labelledby="hl">
        {HOLDINGS.map((h) => <button type="button" class="chip" aria-pressed={holdings.includes(h.id)} onClick={() => onToggle(h.id)}>{h.label}</button>)}
      </div>
      <div class="hint err" role="status">{error ? 'Bitte wähle mindestens eine Option.' : ''}</div>
    </div>
  );
}

function ResultView({ r, stale, onCta }: { r: Result; stale: boolean; onCta: () => void }) {
  const potential = useCountUp(r.potential);
  return (
    <div class={'result' + (stale ? ' stale' : '')}>
      <div class="panel">
        {stale && <p class="stale-note" role="status">Bitte prüfe deine Angaben. Hier siehst du noch den letzten gültigen Stand.</p>}
        <div class="eyebrow">Dein Ergebnis</div>
        <p class="lead">Bei deinen Angaben können bis zu</p>
        <div class="big" aria-live="polite">{eur(potential)}</div>
        <p class="lead">an Förderung und Steuervorteil ungenutzt liegen.</p>
        <div class="ab">
          <div><small>So, wie du es heute machst</small><strong>{eur(r.endCurrent)}</strong></div>
          <div class="opt"><small>Mit optimierter Strategie</small><strong>{eur(r.endOptimized)}</strong></div>
        </div>
        <div class="eyebrow dim">Endwert nach Steuern bis zur Rente</div>
        <Chart series={r.series} />
      </div>
      <button type="button" class="btn" onClick={onCta}>Kostenloses Erstgespräch buchen</button>
      <p class="legal">{disclaimerText(defaultConfig, r.years)}</p>
    </div>
  );
}

interface Props { tracker: Tracker; calendarId: string }

export function App({ tracker, calendarId }: Props) {
  const [vals, setVals] = useState<Record<NumKey, string>>({ age: '', netIncome: '', monthlySavings: '' });
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [shown, setShown] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});
  const started = useRef(false);
  const lastSent = useRef('');
  const lastValid = useRef<Result | null>(null);

  const inputs: Partial<Inputs> = { age: toNum(vals.age), netIncome: toNum(vals.netIncome), monthlySavings: toNum(vals.monthlySavings), holdings };
  const errs = validate(inputs);
  const allOk = errs.length === 0;
  const dKey = useDebounced(JSON.stringify(inputs), 350); // stabiler Schluessel statt neuem Objekt je Render
  const dInputs = useMemo(() => JSON.parse(dKey) as Partial<Inputs>, [dKey]);
  const dOk = validate(dInputs).length === 0;
  if (shown && dOk) lastValid.current = calculate(dInputs as Inputs);

  useEffect(() => {
    tracker.track('rechner_view');
    onCalendlyScheduled(() => tracker.track('calendly_scheduled'));
  }, []);

  // Aenderungen im Ergebnis-Zustand: entprellt als rechner_edit mit neuem Ergebnis.
  useEffect(() => {
    if (!shown || !dOk) return;
    const key = JSON.stringify(dInputs);
    if (key === lastSent.current) return;
    const t = setTimeout(() => {
      lastSent.current = key;
      const r = calculate(dInputs as Inputs);
      tracker.track('rechner_edit', { inputs: dInputs, result: summary(r), calcVersion: r.calcVersion });
    }, 700);
    return () => clearTimeout(t);
  }, [shown, dInputs]);

  const touch = () => { if (!started.current) { started.current = true; tracker.track('rechner_start'); } };
  const change = (key: NumKey) => (v: string) => { touch(); setVals((s) => ({ ...s, [key]: v })); };
  const blur = (key: NumKey) => () => {
    setBlurred((b) => ({ ...b, [key]: true }));
    if (vals[key]) tracker.track('rechner_step', { field: key, value: toNum(vals[key]) });
  };
  const toggle = (h: Holding) => {
    touch();
    setBlurred((b) => ({ ...b, holdings: true }));
    setHoldings((cur) => {
      if (h === 'nothing') return cur.includes('nothing') ? [] : ['nothing'];
      const w = cur.filter((x) => x !== 'nothing');
      return w.includes(h) ? w.filter((x) => x !== h) : [...w, h];
    });
  };

  function show() {
    setSubmitted(true);
    if (!allOk) return;
    const r = calculate(inputs as Inputs);
    lastSent.current = JSON.stringify(inputs);
    setShown(true);
    tracker.track('rechner_result', { inputs, result: summary(r), calcVersion: r.calcVersion });
    startCalendly(calendarId);
  }
  const onCta = () => { tracker.track('rechner_cta_click'); startCalendly(calendarId); scrollToCalendar(calendarId); };
  const fieldErr = (k: string) => (submitted || !!blurred[k]) && errs.includes(k);

  return (
    <div class="wrap">
      <div class={'card' + (shown ? ' is-result' : '')}>
        {!shown && (
          <header class="head">
            <h2 class="title">Dein Check in 60 Sekunden</h2>
            <p class="subtitle">Vier Angaben, das Ergebnis siehst du sofort.</p>
          </header>
        )}
        <div class="fields">
          {FIELDS.map((f) => (
            <Field f={f} compact={shown} value={vals[f.key]} error={fieldErr(f.key)} onChange={change(f.key)} onBlur={blur(f.key)} onEnter={show} />
          ))}
          <Chips holdings={holdings} error={fieldErr('holdings')} onToggle={toggle} />
        </div>
        {!shown ? (
          <div class="foot">
            <button type="button" class="btn" onClick={show}>Ergebnis zeigen</button>
            <p class="legal">Deine Angaben nutzen wir nur für diese Berechnung und dein Gespräch. [DATENSCHUTZ-HINWEIS PRÜFEN]</p>
          </div>
        ) : (
          lastValid.current && <ResultView r={lastValid.current} stale={!dOk} onCta={onCta} />
        )}
      </div>
    </div>
  );
}

function summary(r: Result) {
  return { endCurrent: r.endCurrent, endOptimized: r.endOptimized, potential: r.potential, years: r.years };
}
