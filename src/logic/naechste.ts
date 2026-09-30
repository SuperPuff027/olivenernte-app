import type { Baum } from '../model/typen';
import { passtZuFilter, type BaumFilter, type FilterMerkmale } from './filter';
import { abstandM } from './gpsMittel';

// Während der Ernte: die nächsten passenden Bäume zu einem Bezugspunkt (eigener Standort oder
// der gerade geerntete Baum), mit Entfernung und Himmelsrichtung.

export const HIMMELSRICHTUNGEN = ['n', 'no', 'o', 'so', 's', 'sw', 'w', 'nw'] as const;
export type Himmelsrichtung = (typeof HIMMELSRICHTUNGEN)[number];

export interface Punkt {
  lat: number;
  lon: number;
}

export interface Treffer {
  baum: Baum;
  abstandM: number;
  richtung: Himmelsrichtung;
}

/** Richtung von a nach b als einer von 8 Sektoren (N = 0°, im Uhrzeigersinn). */
export function richtung(a: Punkt, b: Punkt): Himmelsrichtung {
  const rad = Math.PI / 180;
  const ost = (b.lon - a.lon) * Math.cos(((a.lat + b.lat) / 2) * rad);
  const nord = b.lat - a.lat;
  const grad = (Math.atan2(ost, nord) / rad + 360) % 360;
  return HIMMELSRICHTUNGEN[Math.round(grad / 45) % 8] ?? 'n';
}

/**
 * Die nächsten aktiven Bäume, die zum Filter passen, aufsteigend nach Entfernung.
 * Geerntete Bäume werden übersprungen, außer der Filter verlangt ausdrücklich „geerntet“.
 * ausserId schließt den Bezugsbaum selbst aus.
 */
export function naechsteBaeume(
  bezug: Punkt,
  baeume: readonly Baum[],
  merkmale: (baum: Baum) => FilterMerkmale,
  filter: BaumFilter,
  anzahl: number,
  ausserId: string | null = null,
): Treffer[] {
  const geerntetGesucht = filter.status === 'geerntet';
  return baeume
    .filter((b) => {
      if (b.geloescht || b.id === ausserId) return false;
      const m = merkmale(b);
      if (m.status === 'geerntet' && !geerntetGesucht) return false;
      return passtZuFilter(m, filter);
    })
    .map((baum) => ({ baum, abstandM: abstandM(bezug, baum), richtung: richtung(bezug, baum) }))
    .sort((x, y) => x.abstandM - y.abstandM || x.baum.nummer.localeCompare(y.baum.nummer))
    .slice(0, Math.max(0, anzahl));
}
