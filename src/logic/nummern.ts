import type { Baum } from '../model/typen';
import type { Sprache } from './sprache';
import { kleinschreiben } from './text';

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

/** Bringt Varianten wie „b7“ oder „B_007“ in die Form „B-7“; andere Nummern nur ohne Rand-Leerzeichen. */
export function normiereNummer(nummer: string): string {
  const wert = nummerWert(nummer);
  return wert === null ? nummer.trim() : `${NUMMERN_PRAEFIX}${wert}`;
}

export type NummernFehler = 'leer' | 'doppelt';

/** Vergleichsform: Varianten derselben B-n gelten als gleich, sonst ohne Groß-/Kleinschreibung. */
function nummernSchluessel(nummer: string, sprache: Sprache): string {
  return kleinschreiben(normiereNummer(nummer), sprache);
}

/** Prüft eine von Hand eingegebene Nummer gegen die aktiven Bäume; eigeneId schließt den bearbeiteten Baum aus. */
export function pruefeNummer(
  nummer: string,
  baeume: readonly Baum[],
  sprache: Sprache,
  eigeneId: string | null = null,
): NummernFehler | null {
  if (nummer.trim() === '') return 'leer';
  const schluessel = nummernSchluessel(nummer, sprache);
  const doppelt = baeume.some(
    (b) => b.id !== eigeneId && !b.geloescht && nummernSchluessel(b.nummer, sprache) === schluessel,
  );
  return doppelt ? 'doppelt' : null;
}
