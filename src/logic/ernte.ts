import type { SaisonStatus } from '../model/typen';

// Ernte eines Baums: Status „geerntet“ mit Ertrag und Erntedatum.

export type ErnteAenderung = Pick<SaisonStatus, 'status' | 'ertrag_kg' | 'erntedatum'>;

/** Datum im Format JJJJ-MM-TT nach der Uhr des Geräts (nicht UTC: Ernte kurz nach Mitternacht zählt zum neuen Tag). */
export function lokalesDatum(jetzt: Date): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}`;
}

/**
 * Änderung für „geerntet“: Status und Ertrag (null = ohne Menge). Das Erntedatum ist heute,
 * außer der Baum war schon als geerntet markiert – dann bleibt sein ursprüngliches Datum.
 */
export function ernteAenderung(vorher: SaisonStatus | null, kg: number | null, jetzt: Date): ErnteAenderung {
  const warGeerntet = vorher !== null && !vorher.geloescht && vorher.status === 'geerntet';
  return {
    status: 'geerntet',
    ertrag_kg: kg,
    erntedatum: warGeerntet && vorher.erntedatum ? vorher.erntedatum : lokalesDatum(jetzt),
  };
}
