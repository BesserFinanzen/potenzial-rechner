# Rechenlogik

Status: **Platzhalter** – finale Hebel (ETF-Steuer/Kosten, Zulagen, bAV u. a.) werden nachgelagert festgelegt.

Aktuell (`src/calc/engine.ts`): monatliche Sparrate bis Alter 67, monatliche Verzinsung, Endwert nach Steuern auf Gewinne.
A = „so wie heute“ (Platzhalter-Kosten 1,5 %, 26,375 % Steuer), B = „optimiert“ (0,2 % Kosten, 30 % Teilfreistellung).
Potenzial `[X]` = B − A. Annahmen und Disclaimer stehen zentral in `src/calc/config.ts`; bei Änderungen `calcVersion` erhöhen.
