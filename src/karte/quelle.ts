// Einzige Stelle, an der die Hintergrundkarte definiert ist. Ein eigenes
// Drohnen-Orthofoto ersetzt später nur dieses Objekt.

export interface Kartenquelle {
  id: string;
  /** Kachel-URL mit {z}/{x}/{y} */
  kachelUrl: string;
  kachelGroesse: number;
  minZoom: number;
  /** Höchste Zoomstufe mit echten Bildern; darüber wird vergrößert. */
  maxZoom: number;
  namensnennung: string;
  /** Cache-Storage-Name für diese Quelle (Service Worker und Offline-Download). */
  cacheName: string;
  /** Alles bis vor {z}; daran erkennt der Service Worker die Kacheln. */
  kachelUrlPraefix: string;
  /** Ab dieser Zoomstufe wird die Ebene ausgeblendet (z. B. Ortsnamen nah am Hain). */
  sichtbarBisZoom?: number;
}

const ESRI_PRAEFIX = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/';

export const ESRI_WORLD_IMAGERY: Kartenquelle = {
  id: 'esri-world-imagery',
  kachelUrl: `${ESRI_PRAEFIX}{z}/{y}/{x}`,
  kachelUrlPraefix: ESRI_PRAEFIX,
  cacheName: 'kacheln-esri-world-imagery',
  kachelGroesse: 256,
  minZoom: 0,
  // Über dem Hain liefert Esri ab Zoom 19 nur „Map data not yet available“ (geprüft 09/2026).
  maxZoom: 18,
  namensnennung:
    'Powered by <a href="https://www.esri.com">Esri</a> | Esri, Maxar, Earthstar Geographics, and the GIS User Community',
};

const ESRI_ORTSNAMEN_PRAEFIX =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/';

/**
 * Transparente Beschriftung (Orts- und Ländernamen, Grenzen) als Rasterkacheln über dem Luftbild.
 * Wie bei geojson.io erscheinen je nach Zoom mehr oder weniger Orte. Keine Vektor-Labels, weil die
 * Schriftdateien aus dem Netz bräuchten.
 */
export const ESRI_ORTSNAMEN: Kartenquelle = {
  id: 'esri-ortsnamen',
  kachelUrl: `${ESRI_ORTSNAMEN_PRAEFIX}{z}/{y}/{x}`,
  kachelUrlPraefix: ESRI_ORTSNAMEN_PRAEFIX,
  cacheName: 'kacheln-esri-ortsnamen',
  kachelGroesse: 256,
  minZoom: 0,
  // Beschriftung gibt es bis Zoom 16, ab 17 sind die Kacheln leer (geprüft 09/2026).
  maxZoom: 16,
  sichtbarBisZoom: 17,
  namensnennung: 'Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS User Community',
};

export const AKTIVE_KARTENQUELLE = ESRI_WORLD_IMAGERY;
/** Beschriftung über der Hintergrundkarte; null = keine (z. B. über einem eigenen Orthofoto). */
export const AKTIVE_BESCHRIFTUNG: Kartenquelle | null = ESRI_ORTSNAMEN;

/** Alle Kachelquellen, die der Service Worker cacht und der Offline-Download lädt. */
export const KACHELQUELLEN: readonly Kartenquelle[] = AKTIVE_BESCHRIFTUNG
  ? [AKTIVE_KARTENQUELLE, AKTIVE_BESCHRIFTUNG]
  : [AKTIVE_KARTENQUELLE];
