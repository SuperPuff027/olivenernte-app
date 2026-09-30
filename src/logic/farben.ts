import type { Baum, ErnteStatus, SaisonStatus, Sorte } from '../model/typen';
import { STANDARD_STATUS } from './datensatz';
import { erstelleMerkmale, istFilterAktiv, KEIN_FILTER, passtZuFilter, type BaumFilter } from './filter';
import { istHexFarbe } from './sorten';

/** Innenfarbe nach Erntestatus; kräftig, damit sie auf dem Luftbild auffällt. */
export const STATUS_FARBEN: Readonly<Record<ErnteStatus, string>> = {
  bereit: '#00c853',
  nicht_bereit: '#d50000',
  geerntet: '#9e9e9e',
};

/** Ohne Saisonstatus gilt ein Baum als nicht bereit (wie ein neu angelegter Status). */
export { STANDARD_STATUS };

/** Ringfarbe für Bäume ohne (gültige) Sorte */
export const RING_OHNE_SORTE = '#ffffff';

export function innenfarbe(status: ErnteStatus | null | undefined): string {
  return STATUS_FARBEN[status ?? STANDARD_STATUS];
}

export function ringfarbe(sorte: Sorte | null | undefined): string {
  return sorte && !sorte.geloescht && istHexFarbe(sorte.ringfarbe) ? sorte.ringfarbe : RING_OHNE_SORTE;
}

/** Deckkraft nicht passender Bäume bei aktivem Filter (60 % durchsichtig) */
export const FILTER_DECKKRAFT = 0.4;
/** Größe passender Bäume bei aktivem Filter (10 % größer) */
export const FILTER_VERGROESSERUNG = 1.1;

export interface BaumPunktEigenschaften {
  id: string;
  nummer: string;
  innen: string;
  ring: string;
  /** 1 oder FILTER_DECKKRAFT */
  deckkraft: number;
  /** Faktor für Radius und Ring: 1 oder FILTER_VERGROESSERUNG */
  groesse: number;
}

export interface BaumPunkte {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    id: string;
    properties: BaumPunktEigenschaften;
    geometry: { type: 'Point'; coordinates: [number, number] };
  }[];
}

/**
 * GeoJSON für die Karte: aktive Bäume mit berechneten Farben der Saison.
 * Mit Filter werden nicht passende Bäume durchsichtig und passende etwas größer. Bäume mit
 * gelöschter oder unbekannter Sorte gelten wie auf der Karte (weißer Ring) als „ohne Sorte“.
 */
export function baumPunkte(
  baeume: readonly Baum[],
  sorten: readonly Sorte[],
  saisonStatus: readonly SaisonStatus[],
  filter: BaumFilter = KEIN_FILTER,
): BaumPunkte {
  const sorteNachId = new Map(sorten.filter((s) => !s.geloescht).map((s) => [s.id, s]));
  const merkmale = erstelleMerkmale(sorten, saisonStatus);
  const aktiv = istFilterAktiv(filter);
  return {
    type: 'FeatureCollection',
    features: baeume
      .filter((b) => !b.geloescht)
      .map((b) => {
        const m = merkmale(b);
        const passt = passtZuFilter(m, filter);
        return {
          type: 'Feature',
          id: b.id,
          properties: {
            id: b.id,
            nummer: b.nummer,
            innen: innenfarbe(m.status),
            ring: ringfarbe(b.sorte_id ? sorteNachId.get(b.sorte_id) : null),
            deckkraft: aktiv && !passt ? FILTER_DECKKRAFT : 1,
            groesse: aktiv && passt ? FILTER_VERGROESSERUNG : 1,
          },
          geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
        };
      }),
  };
}
