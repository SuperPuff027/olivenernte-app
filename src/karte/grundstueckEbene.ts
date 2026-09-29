import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { GeoJsonPolygon } from '../model/typen';

const QUELLE = 'grundstueck';
export const GRUNDSTUECK_EBENEN = ['grundstueck-flaeche', 'grundstueck-rand-schatten', 'grundstueck-rand'] as const;

const LEER = { type: 'FeatureCollection' as const, features: [] };

function daten(polygon: GeoJsonPolygon | null) {
  return polygon ? { type: 'Feature' as const, properties: {}, geometry: polygon } : LEER;
}

/** Legt Quelle und Ebenen an (einmal nach dem Laden der Karte). */
export function legeGrundstueckEbeneAn(karte: MapLibreMap) {
  karte.addSource(QUELLE, { type: 'geojson', data: LEER });
  karte.addLayer({
    id: 'grundstueck-flaeche',
    type: 'fill',
    source: QUELLE,
    paint: { 'fill-color': '#ffd600', 'fill-opacity': 0.08 },
  });
  // Dunkler Rand unter der gelben Linie: sichtbar auf hellem und dunklem Untergrund.
  karte.addLayer({
    id: 'grundstueck-rand-schatten',
    type: 'line',
    source: QUELLE,
    layout: { 'line-join': 'round' },
    paint: { 'line-color': '#000000', 'line-width': 6, 'line-opacity': 0.6 },
  });
  karte.addLayer({
    id: 'grundstueck-rand',
    type: 'line',
    source: QUELLE,
    layout: { 'line-join': 'round' },
    paint: { 'line-color': '#ffd600', 'line-width': 3 },
  });
}

export function setzeGrundstueckDaten(karte: MapLibreMap, polygon: GeoJsonPolygon | null) {
  karte.getSource<GeoJSONSource>(QUELLE)?.setData(daten(polygon));
}

export function zeigeGrundstueckEbene(karte: MapLibreMap, sichtbar: boolean) {
  for (const id of GRUNDSTUECK_EBENEN) karte.setLayoutProperty(id, 'visibility', sichtbar ? 'visible' : 'none');
}
