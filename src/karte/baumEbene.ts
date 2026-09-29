import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { BaumPunkte } from '../logic/farben';

const QUELLE = 'baeume';
export const BAUM_EBENE = 'baeume';

// Je Zoomstufe: Radius des Innenkreises und Ringbreite; dazwischen linear.
// Bewusst klein (bei Zoom 18 rund 3 m Durchmesser), damit dicht stehende Bäume sich nicht
// überdecken und das Luftbild sichtbar bleibt. Antippbar sind sie über eine größere Trefferfläche.
const STUFEN = [
  { zoom: 14, radius: 1.5, ring: 1 },
  { zoom: 16, radius: 2.5, ring: 1.5 },
  { zoom: 18, radius: 4, ring: 2 },
  { zoom: 20, radius: 7, ring: 2.5 },
];
const SCHATTEN_EXTRA = 1;

// zoom ist nur als Eingabe eines interpolate auf oberster Ebene erlaubt, daher je Wert ein eigener Ausdruck.
function nachZoom(wert: (stufe: (typeof STUFEN)[number]) => number) {
  return ['interpolate', ['linear'], ['zoom'], ...STUFEN.flatMap((st) => [st.zoom, wert(st)])] as unknown as number;
}

const LEER: BaumPunkte = { type: 'FeatureCollection', features: [] };

/** Legt Quelle und Ebenen an (einmal nach dem Laden der Karte, über der Grundstücksebene). */
export function legeBaumEbeneAn(karte: MapLibreMap) {
  karte.addSource(QUELLE, { type: 'geojson', data: LEER });
  // Dunkler Schatten unter Ring und Füllung: Kontrast auf hellem wie dunklem Luftbild.
  karte.addLayer({
    id: 'baeume-schatten',
    type: 'circle',
    source: QUELLE,
    paint: {
      'circle-color': '#000000',
      'circle-opacity': 0.7,
      'circle-radius': nachZoom((st) => st.radius + st.ring + SCHATTEN_EXTRA),
    },
  });
  karte.addLayer({
    id: BAUM_EBENE,
    type: 'circle',
    source: QUELLE,
    paint: {
      'circle-color': ['get', 'innen'],
      'circle-radius': nachZoom((st) => st.radius),
      'circle-stroke-color': ['get', 'ring'],
      'circle-stroke-width': nachZoom((st) => st.ring),
    },
  });
}

export function setzeBaumDaten(karte: MapLibreMap, punkte: BaumPunkte) {
  karte.getSource<GeoJSONSource>(QUELLE)?.setData(punkte);
}
