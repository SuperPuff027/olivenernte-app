import type { Sprache } from './sprache';

// Mengeneingabe in kg (Ertrag eines Baums), tolerant gegenüber Dezimalkomma und -punkt.

/** Obergrenze pro Baum; ein großer Olivenbaum trägt selten über 100 kg. */
export const MAX_KG_PRO_BAUM = 500;

export type KgFehler = 'leer' | 'ungueltig' | 'negativ' | 'zu_gross';

export type KgErgebnis = { ok: true; kg: number } | { ok: false; fehler: KgFehler };

/** Tausendertrennzeichen je Sprache (Deutsch und Türkisch „.“, Englisch „,“). */
function tausenderZeichen(sprache: Sprache): string {
  return sprache === 'en' ? ',' : '.';
}

/**
 * Liest eine Menge wie „12,5“, „12.5“, „12“ oder „12,5 kg“. Ein einzelnes Komma oder ein einzelner
 * Punkt gilt als Dezimaltrennzeichen – außer es folgen genau drei Ziffern auf das
 * Tausendertrennzeichen der Sprache („1,500“ auf Englisch = 1500), dann wird es als Tausender
 * gelesen und scheitert an der Obergrenze statt still falsch zu werden. Gerundet auf 0,1 kg.
 */
export function leseKg(text: string, sprache: Sprache): KgErgebnis {
  // Leerzeichen mitten in der Zahl sind mehrdeutig („1 2“) und damit ungültig.
  const bereinigt = text.trim().replace(/\s*kg$/i, '');
  if (bereinigt === '') return { ok: false, fehler: 'leer' };

  const treffer = /^([+-]?)(\d*)(?:([.,])(\d*))?$/.exec(bereinigt);
  if (!treffer) return { ok: false, fehler: 'ungueltig' };
  const [, vorzeichen = '', ganz = '', trenner, nachkomma = ''] = treffer;
  if (ganz === '' && nachkomma === '') return { ok: false, fehler: 'ungueltig' };

  const alsTausender = trenner === tausenderZeichen(sprache) && ganz !== '' && nachkomma.length === 3;
  const zahl = alsTausender ? Number(`${ganz}${nachkomma}`) : Number(`${ganz || '0'}.${nachkomma || '0'}`);
  if (!Number.isFinite(zahl)) return { ok: false, fehler: 'ungueltig' };

  const kg = vorzeichen === '-' ? -zahl : zahl;
  if (kg < 0) return { ok: false, fehler: 'negativ' };
  if (kg > MAX_KG_PRO_BAUM) return { ok: false, fehler: 'zu_gross' };
  return { ok: true, kg: Math.round(kg * 10) / 10 };
}

/** Wert für ein Eingabefeld: mit dem Dezimalzeichen der Sprache, ohne Tausendertrennung. */
export function kgFuerEingabe(kg: number, sprache: Sprache): string {
  return new Intl.NumberFormat(sprache, { maximumFractionDigits: 1, useGrouping: false }).format(kg);
}
