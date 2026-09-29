import type { Baum } from '../model/typen';

// Baumnummern: sichtbar und kurz, Format „B-17“.

export const NUMMERN_PRAEFIX = 'B-';

// Toleriert Varianten aus Handeingabe oder fremden Dateien: „B-7“, „b_7“, „B 7“, „B7“, „B-007“.
const MUSTER = /^B[-_ ]?(\d+)$/i;

/** Laufende Zahl einer Nummer im B-n-Format, sonst null. */
export function nummerWert(nummer: string): number | null {
  const treffer = MUSTER.exec(nummer.trim());
  if (!treffer?.[1]) return null;
  const wert = Number(treffer[1]);
  return Number.isSafeInteger(wert) ? wert : null;
}

/**
 * Nächste freie Nummer: höchste B-n unter den aktiven Bäumen + 1.
 * Lücken werden nicht aufgefüllt, fremde Formate ignoriert.
 */
export function naechsteNummer(baeume: readonly Baum[]): string {
  let hoechste = 0;
  for (const b of baeume) {
    if (b.geloescht) continue;
    const wert = nummerWert(b.nummer);
    if (wert !== null && wert > hoechste) hoechste = wert;
  }
  return `${NUMMERN_PRAEFIX}${hoechste + 1}`;
}
