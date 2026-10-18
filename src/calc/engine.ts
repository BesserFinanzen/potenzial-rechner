import { CalcConfig, defaultConfig } from './config';
import { marginalTaxRate } from './tax';

export interface Inputs {
  age: number;
  netIncome: number; // EUR / Monat
  monthlySavings: number; // EUR / Monat
}

export interface SeriesPoint {
  age: number;
  current: number;
  optimized: number;
}

export interface Result {
  years: number;
  endCurrent: number; // [A]
  endOptimized: number; // [B]
  potential: number; // [X] = B - A
  marginalRate: number; // geschaetzter Grenzsteuersatz
  annualRefund: number; // Steuererstattung pro Jahr
  totalRefund: number; // Summe der Erstattungen bis zur Rente (ohne Rendite)
  series: SeriesPoint[];
  calcVersion: string;
}

/**
 * Endwert nach Steuern bei monatlicher Sparrate, monatlicher Verzinsung.
 * `refund` ist die monatliche Steuererstattung, die zusaetzlich mitinvestiert wird.
 */
function simulate(
  monthly: number,
  refund: number,
  years: number,
  gross: number,
  p: { annualCost: number; taxRateOnGains: number },
): number[] {
  const net = Math.max(gross - p.annualCost, 0);
  const r = Math.pow(1 + net, 1 / 12) - 1;
  const deposit = monthly + refund;
  let value = 0;
  let paid = 0;
  const out = [0];
  for (let m = 1; m <= years * 12; m++) {
    value = (value + deposit) * (1 + r);
    paid += deposit;
    if (m % 12 === 0) {
      const gains = Math.max(value - paid, 0);
      out.push(value - gains * p.taxRateOnGains);
    }
  }
  return out;
}

export function calculate(input: Inputs, config: CalcConfig = defaultConfig): Result {
  const years = Math.max(config.retirementAge - input.age, 0);
  const monthly = Math.max(input.monthlySavings, 0);
  const marginalRate = marginalTaxRate(input.netIncome);
  const refund = monthly * marginalRate;
  const cur = simulate(monthly, 0, years, config.grossReturn, config.current);
  const opt = simulate(monthly, refund, years, config.grossReturn, config.optimized);
  const series = cur.map((c, i) => ({
    age: input.age + i,
    current: Math.round(c),
    optimized: Math.round(opt[i]),
  }));
  const endCurrent = Math.round(cur[cur.length - 1]);
  const endOptimized = Math.round(opt[opt.length - 1]);
  return {
    years,
    endCurrent,
    endOptimized,
    potential: Math.max(endOptimized - endCurrent, 0),
    marginalRate,
    annualRefund: Math.round(refund * 12),
    totalRefund: Math.round(refund * 12 * years),
    series,
    calcVersion: config.calcVersion,
  };
}

export const eur = (n: number): string =>
  Math.round(n).toLocaleString('de-DE') + ' €';

export function validate(i: Partial<Inputs>): string[] {
  const e: string[] = [];
  if (!i.age || i.age < 16 || i.age > 66) e.push('age');
  if (!i.netIncome || i.netIncome < 500 || i.netIncome > 20000) e.push('netIncome');
  if (i.monthlySavings == null || i.monthlySavings < 0 || i.monthlySavings > 10000) e.push('monthlySavings');
  return e;
}
