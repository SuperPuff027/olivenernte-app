import { GeolocateControl, Map as MapLibreMap, Marker, setWorkerUrl, type MapMouseEvent, type MapOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { pruefeAnsicht, type Ansicht } from '../logic/ansicht';
import type { Bereich } from '../logic/bereich';
import type { BaumPunkte } from '../logic/farben';
import type { GeoJsonPolygon, Position } from '../model/typen';
import { baumAnPunkt, legeBaumEbeneAn, markiereBaumAuswahl, setzeBaumDaten } from './baumEbene';
import { legeGrundstueckEbeneAn, setzeGrundstueckDaten, zeigeGrundstueckEbene } from './grundstueckEbene';
import { AKTIVE_KARTENQUELLE, type Kartenquelle } from './quelle';

// MapLibre lädt seinen Worker als eigene Datei; Vite bündelt sie und liefert die URL.
setWorkerUrl(maplibreWorkerUrl);

type Stil = Exclude<MapOptions['style'], string | undefined>;

const ANSICHT_SCHLUESSEL = 'olivenernte.ansicht';
/** Ohne gespeicherte Ansicht: ganze Welt, bis ein Grundstück existiert. */
const START_ANSICHT: Ansicht = { lon: 0, lat: 20, zoom: 1 };
/** Über maxZoom der Quelle hinaus wird vergrößert, damit einzelne Bäume antippbar sind. */
const MAX_ZOOM = 21;
/** Beim Zoomen auf einen Bereich nicht über die letzte Stufe mit echten Luftbildern hinaus. */
const BEREICH_MAX_ZOOM = AKTIVE_KARTENQUELLE.maxZoom;
const ANIMATION_AB_ZOOM = 12;
/** Mindestabstand eines hervorgehobenen Punkts vom Rand des sichtbaren Bereichs */
const RAND_PX = 40;

export interface KartenSteuerung {
  karte: MapLibreMap;
  /** false beim allerersten Start: dann soll die App auf das Grundstück zoomen. */
  hatteGespeicherteAnsicht: boolean;
  /** Zeigt und verfolgt die eigene Position (inkl. Genauigkeitskreis). */
  zeigeStandort(): void;
  zeigeBereich(bereich: Bereich, animiert?: boolean): void;
  /** Führt fn aus, sobald die Karte (einmalig) geladen ist; danach sofort. */
  beiGeladen(fn: () => void): void;
  setzeGrundstueck(polygon: GeoJsonPolygon | null): void;
  zeigeGrundstueck(sichtbar: boolean): void;
  setzeBaeume(punkte: BaumPunkte): void;
  /** Meldet jeden Tipp auf die Karte; Doppeltipp-Zoom ist solange aus. Rückgabe beendet den Modus. */
  starteTippModus(beiTipp: (punkt: Position) => void): () => void;
  /** Meldet jeden Tipp auf die Karte mit dem getroffenen Baum (oder null). */
  beiBaumTipp(fn: (baumId: string | null) => void): void;
  markiereBaum(id: string | null): void;
  /** Verschiebt die Karte, falls der Punkt unter einem unten eingeblendeten Panel läge. */
  haltePunktSichtbar(punkt: Position, verdecktUntenPx: number): void;
  /** Zeigt den aktuellen Messpunkt der GPS-Mittelung (null blendet ihn aus). */
  zeigeMesspunkt(punkt: Position | null): void;
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

function ladeAnsicht(): Ansicht | null {
  try {
    const roh = localStorage.getItem(ANSICHT_SCHLUESSEL);
    return roh ? pruefeAnsicht(JSON.parse(roh)) : null;
  } catch {
    return null;
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
  const gespeichert = ladeAnsicht();
  const ansicht = gespeichert ?? START_ANSICHT;
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

  // Eigenes Signal statt loaded()/isStyleLoaded(): die sind auch nach dem Start zeitweise false
  // (Kacheln oder GeoJSON laden), und ein once('load') danach feuert nie mehr.
  let geladen = false;
  const wartende: (() => void)[] = [];
  const beiGeladen = (fn: () => void) => (geladen ? fn() : wartende.push(fn));
  karte.once('load', () => {
    legeGrundstueckEbeneAn(karte);
    legeBaumEbeneAn(karte);
    geladen = true;
    for (const fn of wartende.splice(0)) fn();
  });

  let messpunkt: Marker | null = null;

  let baumTipp: ((baumId: string | null) => void) | null = null;
  karte.on('click', (e) => baumTipp?.(geladen ? baumAnPunkt(karte, e.point.x, e.point.y) : null));

  return {
    karte,
    hatteGespeicherteAnsicht: gespeichert !== null,
    zeigeStandort: () => beiGeladen(() => standort.trigger()),
    zeigeBereich: (bereich, animiert = true) => {
      // Aus weiter Entfernung (z. B. Weltansicht) springen statt sekundenlang zu fliegen.
      const nah = karte.getZoom() >= ANIMATION_AB_ZOOM;
      karte.fitBounds(bereich, { padding: 40, maxZoom: BEREICH_MAX_ZOOM, animate: animiert && nah });
    },
    beiGeladen,
    setzeGrundstueck: (polygon) => beiGeladen(() => setzeGrundstueckDaten(karte, polygon)),
    zeigeGrundstueck: (sichtbar) => beiGeladen(() => zeigeGrundstueckEbene(karte, sichtbar)),
    setzeBaeume: (punkte) => beiGeladen(() => setzeBaumDaten(karte, punkte)),
    starteTippModus: (beiTipp) => {
      // Sonst würde ein Doppeltipp zwei Tipps melden und zusätzlich zoomen.
      karte.doubleClickZoom.disable();
      karte.getCanvas().style.cursor = 'crosshair';
      const beiKlick = (e: MapMouseEvent) => beiTipp([e.lngLat.lng, e.lngLat.lat]);
      karte.on('click', beiKlick);
      return () => {
        karte.off('click', beiKlick);
        karte.getCanvas().style.cursor = '';
        karte.doubleClickZoom.enable();
      };
    },
    beiBaumTipp: (fn) => (baumTipp = fn),
    markiereBaum: (id) => beiGeladen(() => markiereBaumAuswahl(karte, id)),
    haltePunktSichtbar: (punkt, verdecktUntenPx) => {
      const p = karte.project([punkt[0], punkt[1]]);
      const hoehe = karte.getContainer().clientHeight;
      const sichtbarBis = hoehe - verdecktUntenPx - RAND_PX;
      // Punkt in die Mitte des frei bleibenden oberen Bereichs schieben
      if (p.y > sichtbarBis || p.y < RAND_PX) karte.panBy([0, p.y - (hoehe - verdecktUntenPx) / 2]);
    },
    zeigeMesspunkt: (punkt) => {
      if (!punkt) {
        messpunkt?.remove();
        messpunkt = null;
        return;
      }
      if (!messpunkt) {
        const element = document.createElement('div');
        element.className = 'messpunkt';
        messpunkt = new Marker({ element }).setLngLat([punkt[0], punkt[1]]).addTo(karte);
      } else {
        messpunkt.setLngLat([punkt[0], punkt[1]]);
      }
    },
    entferne: () => karte.remove(),
  };
}
