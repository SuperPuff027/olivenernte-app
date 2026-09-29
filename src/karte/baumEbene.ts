import type { GeoJSONSource, Map as MapLibreMap, PointLike } from 'maplibre-gl';
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
/** Abstand der Auswahlmarkierung vom Punkt */
const AUSWAHL_ABSTAND = 5;
/** Halbe Kantenlänge der Trefferfläche beim Antippen (ca. 44 px, auch mit Handschuhen). */
const TREFFER_PX = 22;
const AUSWAHL_EBENEN = ['baeume-auswahl-schatten', 'baeume-auswahl'];

// zoom ist nur als Eingabe eines interpolate auf oberster Ebene erlaubt, daher je Wert ein eigener Ausdruck.
// Die Stützwerte werden mit der Eigenschaft „groesse“ jedes Baums (Sortenfilter) multipliziert.
function nachZoom(wert: (stufe: (typeof STUFEN)[number]) => number) {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ...STUFEN.flatMap((st) => [st.zoom, ['*', wert(st), ['get', 'groesse']]]),
  ] as unknown as number;
}
const DECKKRAFT = ['get', 'deckkraft'] as unknown as number;
/** Gefilterte (größere) Bäume über den durchsichtigen zeichnen */
const REIHENFOLGE = ['get', 'groesse'] as unknown as number;

const LEER: BaumPunkte = { type: 'FeatureCollection', features: [] };

/** Legt Quelle und Ebenen an (einmal nach dem Laden der Karte, über der Grundstücksebene). */
export function legeBaumEbeneAn(karte: MapLibreMap) {
  karte.addSource(QUELLE, { type: 'geojson', data: LEER });
  // Dunkler Schatten unter Ring und Füllung: Kontrast auf hellem wie dunklem Luftbild.
  karte.addLayer({
    id: 'baeume-schatten',
    type: 'circle',
    source: QUELLE,
    layout: { 'circle-sort-key': REIHENFOLGE },
    paint: {
      'circle-color': '#000000',
      'circle-opacity': ['*', 0.7, ['get', 'deckkraft']] as unknown as number,
      'circle-radius': nachZoom((st) => st.radius + st.ring + SCHATTEN_EXTRA),
    },
  });
  karte.addLayer({
    id: BAUM_EBENE,
    type: 'circle',
    source: QUELLE,
    layout: { 'circle-sort-key': REIHENFOLGE },
    paint: {
      'circle-color': ['get', 'innen'],
      'circle-opacity': DECKKRAFT,
      'circle-stroke-opacity': DECKKRAFT,
      'circle-radius': nachZoom((st) => st.radius),
      'circle-stroke-color': ['get', 'ring'],
      'circle-stroke-width': nachZoom((st) => st.ring),
    },
  });
  // Auswahl: weißer Ring mit dunklem Rand um den gewählten Baum. Filter über die Eigenschaft id,
  // weil MapLibre Text-IDs von Features nicht behält.
  const auswahlRadius = nachZoom((st) => st.radius + st.ring + AUSWAHL_ABSTAND);
  karte.addLayer({
    id: 'baeume-auswahl-schatten',
    type: 'circle',
    source: QUELLE,
    filter: ['==', ['get', 'id'], ''],
    paint: { 'circle-opacity': 0, 'circle-radius': auswahlRadius, 'circle-stroke-color': '#000000', 'circle-stroke-width': 6 },
  });
  karte.addLayer({
    id: 'baeume-auswahl',
    type: 'circle',
    source: QUELLE,
    filter: ['==', ['get', 'id'], ''],
    paint: { 'circle-opacity': 0, 'circle-radius': auswahlRadius, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 },
  });
}

export function markiereBaumAuswahl(karte: MapLibreMap, id: string | null) {
  for (const ebene of AUSWAHL_EBENEN) karte.setFilter(ebene, ['==', ['get', 'id'], id ?? '']);
}

/** Der Baum, der einem Tipp am nächsten liegt (innerhalb der Trefferfläche), sonst null. */
export function baumAnPunkt(karte: MapLibreMap, x: number, y: number): string | null {
  const flaeche: [PointLike, PointLike] = [
    [x - TREFFER_PX, y - TREFFER_PX],
    [x + TREFFER_PX, y + TREFFER_PX],
  ];
  let bester: { id: string; abstand: number } | null = null;
  for (const f of karte.queryRenderedFeatures(flaeche, { layers: [BAUM_EBENE] })) {
    const id: unknown = f.properties.id;
    if (typeof id !== 'string' || f.geometry.type !== 'Point') continue;
    const [lon, lat] = f.geometry.coordinates;
    if (lon === undefined || lat === undefined) continue;
    const p = karte.project([lon, lat]);
    const abstand = Math.hypot(p.x - x, p.y - y);
    if (!bester || abstand < bester.abstand) bester = { id, abstand };
  }
  return bester?.id ?? null;
}

export function setzeBaumDaten(karte: MapLibreMap, punkte: BaumPunkte) {
  karte.getSource<GeoJSONSource>(QUELLE)?.setData(punkte);
}

/** Blendet einen Baum aus (z. B. während er als ziehbarer Marker verschoben wird); null zeigt alle. */
export function versteckeBaum(karte: MapLibreMap, id: string | null) {
  for (const ebene of ['baeume-schatten', BAUM_EBENE]) karte.setFilter(ebene, id ? ['!=', ['get', 'id'], id] : null);
}
