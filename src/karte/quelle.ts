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

export const AKTIVE_KARTENQUELLE = ESRI_WORLD_IMAGERY;
