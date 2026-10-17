import { CalcConfig, defaultConfig } from './config';

export type Holding = 'nothing' | 'etf' | 'stocks' | 'insurance' | 'building' | 'other';

export interface Inputs {
  age: number;
  netIncome: number; // EUR / Monat
  monthlySavings: number; // EUR / Monat
  holdings: Holding[];
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
  series: SeriesPoint[];
  calcVersion: string;
}

/** Endwert nach Steuern bei monatlicher Sparrate, monatlicher Verzinsung. */
function simulate(
  monthly: number,
  years: number,
  gross: number,
  p: { annualCost: number; taxRateOnGains: number },
): number[] {
  const net = Math.max(gross - p.annualCost, 0);
  const r = Math.pow(1 + net, 1 / 12) - 1;
  let value = 0;
  let paid = 0;
  const out = [0];
  for (let m = 1; m <= years * 12; m++) {
    value = (value + monthly) * (1 + r);
    paid += monthly;
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
  const cur = simulate(monthly, years, config.grossReturn, config.current);
  const opt = simulate(monthly, years, config.grossReturn, config.optimized);
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
  if (!i.holdings || i.holdings.length === 0) e.push('holdings');
  return e;
}
