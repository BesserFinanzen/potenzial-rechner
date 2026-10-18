# Rechenlogik

Status: **Version 0.2.0**. Weitere Hebel (Zulagen, bAV u. a.) werden nachgelagert festgelegt.

## Idee
Der Vorteil entsteht dadurch, dass die Steuererstattung zum **Grenzsteuersatz** zusätzlich investiert wird (8 % Rendite im Durchschnitt).

## Berechnung (`src/calc/engine.ts`)
- Monatliche Sparrate bis Alter 67, monatliche Verzinsung, Endwert nach Steuer auf Gewinne.
- Beide Szenarien: 8 % brutto, 0,2 % Kosten, 26,375 % Steuer × 0,7 (30 % Teilfreistellung).
- **A** („so wie heute“): nur die Sparrate.
- **B** („optimiert“): Sparrate **plus** monatliche Erstattung = Sparrate × Grenzsteuersatz (Beispiel: 300 € bei 30 % → 390 € pro Monat).
- Potenzial `[X]` = B − A, enthält die Rendite auf die Erstattung.
- Angezeigt wird zusätzlich: Steuervorteil pro Jahr (Sparrate × 12 × Grenzsteuersatz) und Steuervorteil bis zur Rente (Summe der Erstattungen ohne Rendite).

## Grenzsteuersatz (`src/calc/tax.ts`)
Netto → geschätztes Brutto (Bisektion, Sozialabgaben pauschal 21 % bis 69.750 € Jahresbrutto) → zu versteuerndes Einkommen (abzüglich 1.266 € Pauschalen) → Grenzsatz aus dem Einkommensteuertarif 2026 (§ 32a EStG, Grundtarif).
Vereinfachungen: Steuerklasse I, ohne Kirchensteuer, Soli vernachlässigt. Unter dem Grundfreibetrag (12.348 €) ist der Satz 0 %.

## Nicht berücksichtigt
Besteuerung in der Auszahlphase, Erstattung kommt monatlich statt als jährliche Rückzahlung.

Annahmen und Disclaimer stehen zentral in `src/calc/config.ts`; bei Änderungen `calcVersion` erhöhen.
