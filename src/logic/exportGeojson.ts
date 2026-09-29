import type { Baum, Grundstueck, SaisonStatus, Sorte } from '../model/typen';
import { APP_MITGLIED } from './importGeojson';

// Export aller aktiven Daten als GeoJSON-FeatureCollection. Lesbar für GIS-Programme
// (Grundstück als Polygon, Bäume als Punkte) und vollständig wieder importierbar:
// IDs, Zeitstempel, Sorten mit Farben und der Saisonstatus aller Jahre sind enthalten.

/** Version des Exportformats; bei inkompatiblen Änderungen erhöhen. */
export const EXPORT_FORMAT = 1;

export interface ExportDaten {
  grundstuecke: readonly Grundstueck[];
  baeume: readonly Baum[];
  sorten: readonly Sorte[];
  saisonStatus: readonly SaisonStatus[];
}

export function erstelleExport(daten: ExportDaten, jetzt: Date, aktuellesJahr: number) {
  const sorten = daten.sorten.filter((s) => !s.geloescht);
  const sorteNachId = new Map(sorten.map((s) => [s.id, s]));
  const statusNachBaum = new Map<string, SaisonStatus[]>();
  for (const s of daten.saisonStatus) {
    if (s.geloescht) continue;
    statusNachBaum.set(s.baum_id, [...(statusNachBaum.get(s.baum_id) ?? []), s]);
  }

  const grundstuecke = daten.grundstuecke
    .filter((g) => !g.geloescht)
    .map((g) => ({
      type: 'Feature' as const,
      properties: { typ: 'grundstueck', id: g.id, name: g.name, aktualisiert_am: g.aktualisiert_am },
      geometry: g.polygon,
    }));

  const baeume = daten.baeume
    .filter((b) => !b.geloescht)
    .map((b) => {
      const saison = (statusNachBaum.get(b.id) ?? [])
        .sort((x, y) => x.jahr - y.jahr)
        .map((s) => ({
          jahr: s.jahr,
          status: s.status,
          fuellstand: s.fuellstand,
          ertrag_kg: s.ertrag_kg,
          erntedatum: s.erntedatum,
          aktualisiert_am: s.aktualisiert_am,
        }));
      const aktuell = saison.find((s) => s.jahr === aktuellesJahr);
      const sorte = b.sorte_id ? sorteNachId.get(b.sorte_id) : undefined;
      return {
        type: 'Feature' as const,
        properties: {
          typ: 'baum',
          id: b.id,
          nummer: b.nummer,
          sorte: sorte?.name ?? null,
          // Flach für GIS-Programme (Einfärben nach Status); beim Import zählt „saison“.
          ringfarbe: sorte?.ringfarbe ?? null,
          status: aktuell?.status ?? null,
          fuellstand: aktuell?.fuellstand ?? null,
          gps_genauigkeit_m: b.gps_genauigkeit_m,
          hoehe_m: b.hoehe_m,
          notiz: b.notiz,
          aktualisiert_am: b.aktualisiert_am,
          saison,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: b.hoehe_m === null ? [b.lon, b.lat] : [b.lon, b.lat, b.hoehe_m],
        },
      };
    });

  return {
    type: 'FeatureCollection' as const,
    [APP_MITGLIED]: {
      format: EXPORT_FORMAT,
      exportiert_am: jetzt.toISOString(),
      sorten: sorten.map((s) => ({ id: s.id, name: s.name, ringfarbe: s.ringfarbe, aktualisiert_am: s.aktualisiert_am })),
    },
    features: [...grundstuecke, ...baeume],
  };
}

/** Dateiname mit lokalem Datum, z. B. „hrvst-2026-09-29.geojson“. */
export function exportDateiname(jetzt: Date): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `hrvst-${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}.geojson`;
}
