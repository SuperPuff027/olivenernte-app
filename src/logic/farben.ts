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

export interface BaumPunktEigenschaften {
  id: string;
  nummer: string;
  innen: string;
  ring: string;
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

/** GeoJSON für die Karte: aktive Bäume mit berechneten Farben der Saison. */
export function baumPunkte(
  baeume: readonly Baum[],
  sorten: readonly Sorte[],
  saisonStatus: readonly SaisonStatus[],
): BaumPunkte {
  const sorteNachId = new Map(sorten.map((s) => [s.id, s]));
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
        },
        geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
      })),
  };
}
