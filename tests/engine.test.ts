import { describe, it, expect } from 'vitest';
import { calculate, validate, eur } from '../src/calc/engine';

const base = { age: 26, netIncome: 2800, monthlySavings: 350 };

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
  it('Steuervorteil: Gesamt = pro Jahr x Laufzeit, Rate plausibel', () => {
    const r = calculate(base);
    expect(r.marginalRate).toBeGreaterThan(0.28);
    expect(r.annualRefund).toBe(Math.round(350 * 12 * r.marginalRate));
    expect(Math.abs(r.totalRefund - r.annualRefund * r.years)).toBeLessThanOrEqual(r.years);
  });
  it('Potenzial entsteht nur durch die Erstattung (hoeher als die reine Summe)', () => {
    const r = calculate(base);
    expect(r.potential).toBeGreaterThan(r.totalRefund * 0.5);
  });
  it('Sparrate 0 ergibt 0', () => {
    const r = calculate({ ...base, monthlySavings: 0 });
    expect(r.endOptimized).toBe(0);
    expect(r.potential).toBe(0);
    expect(r.annualRefund).toBe(0);
  });
  it('Alter 67+ ergibt Laufzeit 0 ohne Absturz', () => {
    expect(calculate({ ...base, age: 67 }).years).toBe(0);
  });
});

describe('validate', () => {
  it('akzeptiert gueltige Eingaben', () => expect(validate(base)).toEqual([]));
  it('meldet fehlende Felder', () =>
    expect(validate({ age: 10 })).toEqual(['age', 'netIncome', 'monthlySavings']));
});

describe('eur', () => {
  it('formatiert deutsch', () => expect(eur(1234567)).toBe('1.234.567 €'));
});
