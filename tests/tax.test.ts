import { describe, it, expect } from 'vitest';
import { incomeTax, marginalRateAt, marginalTaxRate } from '../src/calc/tax';

describe('Tarif 2026', () => {
  it('Grundfreibetrag: keine Steuer, Grenzsatz 0', () => {
    expect(incomeTax(12348)).toBe(0);
    expect(marginalRateAt(12000)).toBe(0);
  });
  it('Eingangssteuersatz knapp ueber dem Grundfreibetrag ca. 14 %', () => {
    expect(marginalRateAt(12349)).toBeCloseTo(0.14, 2);
  });
  it('Grenzsatz bei 50.000 € zvE ca. 35 %', () => {
    expect(marginalRateAt(50000)).toBeCloseTo(0.351, 2);
  });
  it('Spitzen- und Reichensteuersatz', () => {
    expect(marginalRateAt(100000)).toBe(0.42);
    expect(marginalRateAt(300000)).toBe(0.45);
  });
  it('Steuer an den Zonengrenzen stetig', () => {
    expect(Math.abs(incomeTax(17800) - incomeTax(17799))).toBeLessThanOrEqual(1);
    expect(Math.abs(incomeTax(69879) - incomeTax(69878))).toBeLessThanOrEqual(1);
  });
});

describe('marginalTaxRate (aus Netto)', () => {
  it('steigt monoton mit dem Netto', () => {
    let last = 0;
    for (const n of [900, 1500, 2000, 2800, 3500, 4500, 6000, 9000]) {
      const r = marginalTaxRate(n);
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });
  it('2.800 € netto liegt im Bereich 28 bis 36 %', () => {
    const r = marginalTaxRate(2800);
    expect(r).toBeGreaterThan(0.28);
    expect(r).toBeLessThan(0.36);
  });
  it('sehr hohes Netto erreicht den Spitzensatz', () => {
    expect(marginalTaxRate(10000)).toBe(0.42);
  });
  it('ungueltiges Netto ergibt 0', () => {
    expect(marginalTaxRate(0)).toBe(0);
    expect(marginalTaxRate(NaN)).toBe(0);
  });
});
