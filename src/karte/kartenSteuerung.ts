import { GeolocateControl, Map as MapLibreMap, setWorkerUrl, type MapOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { pruefeAnsicht, type Ansicht } from '../logic/ansicht';
import { AKTIVE_KARTENQUELLE, type Kartenquelle } from './quelle';

// MapLibre lädt seinen Worker als eigene Datei; Vite bündelt sie und liefert die URL.
setWorkerUrl(maplibreWorkerUrl);

type Stil = Exclude<MapOptions['style'], string | undefined>;

const ANSICHT_SCHLUESSEL = 'olivenernte.ansicht';
/** Ohne gespeicherte Ansicht: ganze Welt, bis ein Grundstück existiert. */
const START_ANSICHT: Ansicht = { lon: 0, lat: 20, zoom: 1 };
/** Über maxZoom der Quelle hinaus wird vergrößert, damit einzelne Bäume antippbar sind. */
const MAX_ZOOM = 21;

export interface KartenSteuerung {
  karte: MapLibreMap;
  /** Zeigt und verfolgt die eigene Position (inkl. Genauigkeitskreis). */
  zeigeStandort(): void;
  entferne(): void;
}

function stil(quelle: Kartenquelle): Stil {
  // Bewusst ohne glyphs/sprite: keine Netzabhängigkeit außer den Kacheln.
  return {
    version: 8,
    sources: {
      [quelle.id]: {
        type: 'raster',
        tiles: [quelle.kachelUrl],
        tileSize: quelle.kachelGroesse,
        minzoom: quelle.minZoom,
        maxzoom: quelle.maxZoom,
        attribution: quelle.namensnennung,
      },
    },
    layers: [
      { id: 'hintergrund', type: 'background', paint: { 'background-color': '#1b1f17' } },
      { id: 'luftbild', type: 'raster', source: quelle.id },
    ],
  };
}

function ladeAnsicht(): Ansicht {
  try {
    const roh = localStorage.getItem(ANSICHT_SCHLUESSEL);
    return (roh && pruefeAnsicht(JSON.parse(roh))) || START_ANSICHT;
  } catch {
    return START_ANSICHT;
  }
}

function speichereAnsicht(karte: MapLibreMap) {
  const { lng, lat } = karte.getCenter();
  const ansicht: Ansicht = { lon: lng, lat, zoom: karte.getZoom() };
  try {
    localStorage.setItem(ANSICHT_SCHLUESSEL, JSON.stringify(ansicht));
  } catch {
    // Speichern der Ansicht ist nur Komfort.
  }
}

export function erstelleKarte(
  container: HTMLElement,
  beiStandortFehler: (code: number) => void,
): KartenSteuerung {
  const ansicht = ladeAnsicht();
  const karte = new MapLibreMap({
    container,
    style: stil(AKTIVE_KARTENQUELLE),
    center: [ansicht.lon, ansicht.lat],
    zoom: ansicht.zoom,
    maxZoom: MAX_ZOOM,
    // Drehen/Kippen abgeschaltet: im Feld verwirrend und leicht versehentlich ausgelöst.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    attributionControl: { compact: true },
  });
  karte.touchZoomRotate.disableRotation();
  karte.on('moveend', () => speichereAnsicht(karte));

  // Eigener großer Knopf löst die Standortanzeige aus; der kleine MapLibre-Knopf ist per CSS versteckt.
  const standort = new GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showAccuracyCircle: true,
    fitBoundsOptions: { maxZoom: 18 },
  });
  karte.addControl(standort);
  standort.on('error', (e) => beiStandortFehler(e.code));

  return {
    karte,
    zeigeStandort: () => {
      if (karte.loaded()) standort.trigger();
      else karte.once('load', () => standort.trigger());
    },
    entferne: () => karte.remove(),
  };
}
