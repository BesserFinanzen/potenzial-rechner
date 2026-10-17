// Annahmen des Rechners. ACHTUNG: Alle Werte sind PLATZHALTER, bis die finale
// Rechenlogik festgelegt ist (siehe docs/rechenlogik.md). Bei jeder Aenderung
// calcVersion hochzaehlen, damit n8n/CRM Ergebnisse unterscheiden koennen.
export interface CalcConfig {
  calcVersion: string;
  retirementAge: number;
  /** Rendite p.a. vor Kosten und Steuern */
  grossReturn: number;
  current: { annualCost: number; taxRateOnGains: number };
  optimized: { annualCost: number; taxRateOnGains: number };
}

export const defaultConfig: CalcConfig = {
  calcVersion: '0.1.0-platzhalter',
  retirementAge: 67,
  grossReturn: 0.08, // aus dem Seitenmock: 8 % Rendite p.a.
  // "So, wie du es heute machst": Platzhalter fuer teure Produkte ohne Teilfreistellung
  current: { annualCost: 0.015, taxRateOnGains: 0.26375 },
  // "Mit optimierter Strategie": ETF-Kosten 0,2 % (Seitenmock), 30 % Teilfreistellung
  optimized: { annualCost: 0.002, taxRateOnGains: 0.26375 * 0.7 },
};

export function disclaimerText(c: CalcConfig, years: number): string {
  const pct = (n: number) => (n * 100).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  return (
    `Modellrechnung, keine Beratung. Annahmen: ${pct(c.grossReturn)} % Rendite pro Jahr, ` +
    `${years} Jahre Laufzeit, Kosten ${pct(c.current.annualCost)} % (heute) bzw. ` +
    `${pct(c.optimized.annualCost)} % (optimiert), Steuer auf Gewinne ` +
    `${pct(c.current.taxRateOnGains)} % bzw. ${pct(c.optimized.taxRateOnGains)} %. ` +
    `Dein tatsächliches Ergebnis hängt von deiner Situation ab.`
  );
}
