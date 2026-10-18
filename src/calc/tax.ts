// Grenzsteuersatz aus dem Nettoeinkommen. Vereinfachung: Steuerklasse I, ohne
// Kirchensteuer, Soli vernachlaessigt. Tarif 2026 nach § 32a EStG.
const GRUNDFREIBETRAG = 12348;
const ZONE2_END = 17799;
const ZONE3_END = 69878;
const SPITZE_END = 277825;

/** Pauschale Sozialabgaben (Arbeitnehmeranteil) bis zur Beitragsbemessungsgrenze. */
const SV_RATE = 0.21;
const SV_CAP_YEAR = 69750;
/** Werbungskosten- und Sonderausgaben-Pauschale. */
const PAUSCHALEN = 1230 + 36;

/** Einkommensteuer 2026 auf das zu versteuernde Einkommen (Grundtarif). */
export function incomeTax(zvE: number): number {
  const x = Math.floor(Math.max(zvE, 0));
  if (x <= GRUNDFREIBETRAG) return 0;
  if (x <= ZONE2_END) {
    const y = (x - GRUNDFREIBETRAG) / 10000;
    return Math.floor((914.51 * y + 1400) * y);
  }
  if (x <= ZONE3_END) {
    const z = (x - ZONE2_END) / 10000;
    return Math.floor((173.1 * z + 2397) * z + 1034.87);
  }
  if (x <= SPITZE_END) return Math.floor(0.42 * x - 11135.63);
  return Math.floor(0.45 * x - 19470.38);
}

/** Grenzsteuersatz (Ableitung des Tarifs) beim zu versteuernden Einkommen. */
export function marginalRateAt(zvE: number): number {
  const x = Math.floor(Math.max(zvE, 0));
  if (x <= GRUNDFREIBETRAG) return 0;
  if (x <= ZONE2_END) return (2 * 914.51 * ((x - GRUNDFREIBETRAG) / 10000) + 1400) / 10000;
  if (x <= ZONE3_END) return (2 * 173.1 * ((x - ZONE2_END) / 10000) + 2397) / 10000;
  if (x <= SPITZE_END) return 0.42;
  return 0.45;
}

function zvEFromGross(gross: number): number {
  const sv = Math.min(gross, SV_CAP_YEAR) * SV_RATE;
  return Math.max(gross - sv - PAUSCHALEN, 0);
}

function netFromGross(gross: number): number {
  const sv = Math.min(gross, SV_CAP_YEAR) * SV_RATE;
  return gross - sv - incomeTax(zvEFromGross(gross));
}

/** Schaetzt das Jahresbrutto zu einem Jahresnetto per Bisektion. */
function grossFromNet(netYear: number): number {
  let lo = netYear;
  let hi = netYear * 3 + 20000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netFromGross(mid) < netYear) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Grenzsteuersatz (0 bis 0,45) aus dem monatlichen Nettoeinkommen. */
export function marginalTaxRate(netMonthly: number): number {
  if (!(netMonthly > 0)) return 0;
  return marginalRateAt(zvEFromGross(grossFromNet(netMonthly * 12)));
}
