import { useEffect, useRef, useState } from 'preact/hooks';
import { Inputs, Result, calculate, eur, validate } from '../calc/engine';
import { defaultConfig, disclaimerText } from '../calc/config';
import { Tracker } from '../tracking/client';
import { onCalendlyScheduled, startCalendly } from '../integrations/webflow';
import { Chart } from './Chart';

type NumKey = 'age' | 'netIncome' | 'monthlySavings';
interface FieldDef { key: NumKey; label: string; unit: string; ph: string; hint: string }
const FIELDS: FieldDef[] = [
  { key: 'age', label: 'Wie alt bist du?', unit: 'Jahre', ph: 'z. B. 28', hint: 'Bitte 16 bis 66 Jahre' },
  { key: 'netIncome', label: 'Dein monatliches Nettoeinkommen in Euro', unit: '€', ph: 'z. B. 2800', hint: 'Bitte 500 bis 20.000 €' },
  { key: 'monthlySavings', label: 'Was sparst oder investierst du im Monat, in Euro?', unit: '€', ph: 'z. B. 300', hint: 'Bitte 0 bis 10.000 €' },
];

const toNum = (s: string) => (s ? Number(s.replace(/\D/g, '')) : undefined);
const fmt = (s: string) => (s ? Number(s).toLocaleString('de-DE') : '');

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

interface FieldProps { f: FieldDef; value: string; error: boolean; onChange: (v: string) => void; onBlur: () => void; onEnter: () => void }
function Field({ f, value, error, onChange, onBlur, onEnter }: FieldProps) {
  return (
    <div class="fld">
      <label for={f.key}>{f.label}</label>
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

function ResultView({ r, onReset }: { r: Result; onReset: () => void }) {
  const potential = useCountUp(r.potential);
  return (
    <div class="result">
      <div class="panel">
        <div class="eyebrow">Dein Ergebnis</div>
        <p class="lead">Bei deinen Angaben können bis zu</p>
        <div class="big" aria-live="polite">{eur(potential)}</div>
        <p class="lead">an Förderung und Steuervorteil ungenutzt liegen.</p>
        <div class="ab">
          <div><small>So, wie du es heute machst</small><strong>{eur(r.endCurrent)}</strong></div>
          <div class="opt"><small>Mit optimierter Strategie</small><strong>{eur(r.endOptimized)}</strong></div>
        </div>
        <div class="ab tax">
          <div><small>Steuervorteil/Jahr</small><strong>{eur(r.annualRefund)}</strong></div>
          <div><small>Steuervorteil gesamt</small><strong>{eur(r.totalRefund)}</strong></div>
        </div>
        <div class="eyebrow dim">Endwert nach Steuern bis zur Rente</div>
        <Chart series={r.series} />
      </div>
      <button type="button" class="btn" onClick={onReset}>Neu berechnen</button>
      <p class="legal">{disclaimerText(defaultConfig, r.years, r.marginalRate)}</p>
    </div>
  );
}

interface Props { tracker: Tracker; calendarId: string }

export function App({ tracker, calendarId }: Props) {
  const [vals, setVals] = useState<Record<NumKey, string>>({ age: '', netIncome: '', monthlySavings: '' });
  const [result, setResult] = useState<Result | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [blurred, setBlurred] = useState<Record<string, boolean>>({});
  const started = useRef(false);

  const inputs: Partial<Inputs> = { age: toNum(vals.age), netIncome: toNum(vals.netIncome), monthlySavings: toNum(vals.monthlySavings) };
  const errs = validate(inputs);

  useEffect(() => {
    tracker.track('rechner_view');
    onCalendlyScheduled(() => tracker.track('calendly_scheduled'));
  }, []);

  const touch = () => { if (!started.current) { started.current = true; tracker.track('rechner_start'); } };
  const change = (key: NumKey) => (v: string) => { touch(); setVals((s) => ({ ...s, [key]: v })); };
  const blur = (key: NumKey) => () => {
    setBlurred((b) => ({ ...b, [key]: true }));
    if (vals[key]) tracker.track('rechner_step', { field: key, value: toNum(vals[key]) });
  };

  function show() {
    setSubmitted(true);
    if (errs.length) return;
    const r = calculate(inputs as Inputs);
    setResult(r);
    tracker.track('rechner_result', { inputs, result: summary(r), calcVersion: r.calcVersion });
    startCalendly(calendarId);
  }
  // Zurueck zur Eingabe, die Werte bleiben zum Anpassen stehen.
  const reset = () => {
    tracker.track('rechner_reset');
    setResult(null);
    setSubmitted(false);
    setBlurred({});
  };
  const fieldErr = (k: string) => (submitted || !!blurred[k]) && errs.includes(k);

  return (
    <div class="wrap">
      <div class="card">
        {result ? (
          <ResultView r={result} onReset={reset} />
        ) : (
          <>
            <header class="head">
              <h2 class="title">Dein Check in 60 Sekunden</h2>
              <p class="subtitle">Drei Angaben, das Ergebnis siehst du sofort.</p>
            </header>
            <div class="fields">
              {FIELDS.map((f) => (
                <Field f={f} value={vals[f.key]} error={fieldErr(f.key)} onChange={change(f.key)} onBlur={blur(f.key)} onEnter={show} />
              ))}
            </div>
            <div class="foot">
              <button type="button" class="btn" onClick={show}>Ergebnis zeigen</button>
              <p class="legal">Deine Angaben nutzen wir nur für diese Berechnung und dein Gespräch.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function summary(r: Result) {
  return {
    endCurrent: r.endCurrent, endOptimized: r.endOptimized, potential: r.potential, years: r.years,
    marginalRate: r.marginalRate, annualRefund: r.annualRefund, totalRefund: r.totalRefund,
  };
}
