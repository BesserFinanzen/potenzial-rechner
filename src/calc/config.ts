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
  calcVersion: '0.2.0',
  retirementAge: 67,
  grossReturn: 0.08, // 8 % Rendite p.a. im Durchschnitt
  // Beide Szenarien rechnen mit unseren Kosten (0,2 %) und 30 % Teilfreistellung.
  // Der Unterschied ist allein die Steuererstattung (Grenzsteuersatz), die in B mitinvestiert wird.
  current: { annualCost: 0.002, taxRateOnGains: 0.26375 * 0.7 },
  optimized: { annualCost: 0.002, taxRateOnGains: 0.26375 * 0.7 },
};

export function disclaimerText(c: CalcConfig, years: number, marginalRate: number): string {
  const pct = (n: number) => (n * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 });
  return (
    `Modellrechnung, keine Beratung. Annahmen: ${pct(c.grossReturn)} % Rendite pro Jahr, ` +
    `${years} Jahre, Kosten ${pct(c.optimized.annualCost)} %, Steuer auf Gewinne ` +
    `${pct(c.optimized.taxRateOnGains)} %, Erstattung zum Grenzsteuersatz (ca. ` +
    `${pct(marginalRate)} %) wird mitinvestiert. Steuern in der Auszahlphase nicht ` +
    `berücksichtigt.`
  );
}
