import type { Baum, ErnteStatus, SaisonStatus, Sorte } from '../model/typen';
import { istHexFarbe } from './sorten';

/** Innenfarbe nach Erntestatus; kräftig, damit sie auf dem Luftbild auffällt. */
export const STATUS_FARBEN: Readonly<Record<ErnteStatus, string>> = {
  bereit: '#00c853',
  nicht_bereit: '#d50000',
  geerntet: '#9e9e9e',
};

/** Ohne Saisonstatus gilt ein Baum als nicht bereit (wie ein neu angelegter Status). */
export const STANDARD_STATUS: ErnteStatus = 'nicht_bereit';

/** Ringfarbe für Bäume ohne (gültige) Sorte */
export const RING_OHNE_SORTE = '#ffffff';

export function innenfarbe(status: ErnteStatus | null | undefined): string {
  return STATUS_FARBEN[status ?? STANDARD_STATUS];
}

export function ringfarbe(sorte: Sorte | null | undefined): string {
  return sorte && !sorte.geloescht && istHexFarbe(sorte.ringfarbe) ? sorte.ringfarbe : RING_OHNE_SORTE;
}

/** Sortenfilter: sorteId null = Bäume ohne Sorte; der ganze Filter null = kein Filter. */
export type SortenFilter = { sorteId: string | null } | null;

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
  filter: SortenFilter = null,
): BaumPunkte {
  const sorteNachId = new Map(sorten.filter((s) => !s.geloescht).map((s) => [s.id, s]));
  const passt = (b: Baum) => (b.sorte_id !== null && sorteNachId.has(b.sorte_id) ? b.sorte_id : null) === filter?.sorteId;
  const statusNachBaum = new Map(saisonStatus.filter((s) => !s.geloescht).map((s) => [s.baum_id, s.status]));
  return {
    type: 'FeatureCollection',
    features: baeume
      .filter((b) => !b.geloescht)
      .map((b) => ({
        type: 'Feature',
        id: b.id,
        properties: {
          id: b.id,
          nummer: b.nummer,
          innen: innenfarbe(statusNachBaum.get(b.id)),
          ring: ringfarbe(b.sorte_id ? sorteNachId.get(b.sorte_id) : null),
          deckkraft: filter && !passt(b) ? FILTER_DECKKRAFT : 1,
          groesse: filter && passt(b) ? FILTER_VERGROESSERUNG : 1,
        },
        geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
      })),
  };
}
