import { Marker, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl';
import type { Position } from '../model/typen';

// Zeigt den Entwurf einer Grundstücksgrenze mit ziehbaren Eckpunkten.
// Der Zustand (Ring, Auswahl, Verlauf) liegt in der UI; der Editor zeichnet nur und meldet Eingaben.

const QUELLE = 'grenze-entwurf';
const EBENEN = ['grenze-entwurf-flaeche', 'grenze-entwurf-rand'];

export interface GrenzEditorRueckrufe {
  beiTipp(punkt: Position): void;
  beiVerschieben(index: number, punkt: Position): void;
  beiAuswahl(index: number): void;
}

export interface GrenzEditor {
  zeige(ring: readonly Position[], ausgewaehlt: number | null): void;
  beende(): void;
}

function entwurfsDaten(ring: readonly Position[]) {
  const erster = ring[0];
  if (!erster) return { type: 'FeatureCollection' as const, features: [] };
  const geometrie =
    ring.length >= 3
      ? { type: 'Polygon' as const, coordinates: [[...ring, erster]] }
      : { type: 'LineString' as const, coordinates: [...ring] };
  return { type: 'Feature' as const, properties: {}, geometry: geometrie };
}

export function starteGrenzEditor(karte: MapLibreMap, rueckrufe: GrenzEditorRueckrufe): GrenzEditor {
  karte.addSource(QUELLE, { type: 'geojson', data: entwurfsDaten([]) });
  karte.addLayer({
    id: 'grenze-entwurf-flaeche',
    type: 'fill',
    source: QUELLE,
    paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.15 },
  });
  karte.addLayer({
    id: 'grenze-entwurf-rand',
    type: 'line',
    source: QUELLE,
    layout: { 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 3, 'line-dasharray': [2, 1] },
  });

  let marker: Marker[] = [];
  let ring: Position[] = [];
  const quelle = () => karte.getSource<GeoJSONSource>(QUELLE);

  const beiKartenTipp = (e: MapMouseEvent) => rueckrufe.beiTipp([e.lngLat.lng, e.lngLat.lat]);
  karte.on('click', beiKartenTipp);

  function erstelleMarker(punkt: Position, index: number, ausgewaehlt: boolean): Marker {
    const element = document.createElement('div');
    element.className = ausgewaehlt ? 'eckpunkt eckpunkt-gewaehlt' : 'eckpunkt';
    const m = new Marker({ element, draggable: true }).setLngLat([punkt[0], punkt[1]]).addTo(karte);

    // Ein Klick direkt nach dem Ziehen ist keine Auswahl.
    let gezogen = false;
    m.on('dragstart', () => (gezogen = true));
    m.on('drag', () => {
      const { lng, lat } = m.getLngLat();
      quelle()?.setData(entwurfsDaten(ring.map((p, i) => (i === index ? [lng, lat] : p))));
    });
    m.on('dragend', () => {
      const { lng, lat } = m.getLngLat();
      rueckrufe.beiVerschieben(index, [lng, lat]);
      setTimeout(() => (gezogen = false), 0);
    });
    element.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!gezogen) rueckrufe.beiAuswahl(index);
    });
    return m;
  }

  return {
    zeige(neuerRing, ausgewaehlt) {
      ring = [...neuerRing];
      quelle()?.setData(entwurfsDaten(ring));
      for (const m of marker) m.remove();
      marker = ring.map((p, i) => erstelleMarker(p, i, i === ausgewaehlt));
    },
    beende() {
      karte.off('click', beiKartenTipp);
      for (const m of marker) m.remove();
      marker = [];
      for (const id of EBENEN) if (karte.getLayer(id)) karte.removeLayer(id);
      if (karte.getSource(QUELLE)) karte.removeSource(QUELLE);
    },
  };
}
