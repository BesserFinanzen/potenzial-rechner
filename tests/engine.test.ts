import { describe, it, expect } from 'vitest';
import { calculate, validate, eur } from '../src/calc/engine';

const base = { age: 26, netIncome: 2800, monthlySavings: 350, holdings: ['etf' as const] };

describe('calculate', () => {
  it('liefert Laufzeit bis 67 und Serie mit years+1 Punkten', () => {
    const r = calculate(base);
    expect(r.years).toBe(41);
    expect(r.series).toHaveLength(42);
    expect(r.series[0].age).toBe(26);
  });
  it('optimiert > heute, Potenzial = Differenz', () => {
    const r = calculate(base);
    expect(r.endOptimized).toBeGreaterThan(r.endCurrent);
    expect(r.potential).toBe(r.endOptimized - r.endCurrent);
  });
  it('Sparrate 0 ergibt 0', () => {
    const r = calculate({ ...base, monthlySavings: 0 });
    expect(r.endOptimized).toBe(0);
    expect(r.potential).toBe(0);
  });
  it('Alter 67+ ergibt Laufzeit 0 ohne Absturz', () => {
    expect(calculate({ ...base, age: 67 }).years).toBe(0);
  });
});

describe('validate', () => {
  it('akzeptiert gueltige Eingaben', () => expect(validate(base)).toEqual([]));
  it('meldet fehlende Felder', () =>
    expect(validate({ age: 10, holdings: [] })).toEqual(['age', 'netIncome', 'monthlySavings', 'holdings']));
});

describe('eur', () => {
  it('formatiert deutsch', () => expect(eur(1234567)).toBe('1.234.567 €'));
});
