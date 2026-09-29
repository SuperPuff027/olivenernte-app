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
}

export const ESRI_WORLD_IMAGERY: Kartenquelle = {
  id: 'esri-world-imagery',
  kachelUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  kachelGroesse: 256,
  minZoom: 0,
  // Über dem Hain liefert Esri ab Zoom 19 nur „Map data not yet available“ (geprüft 09/2026).
  maxZoom: 18,
  namensnennung:
    'Powered by <a href="https://www.esri.com">Esri</a> | Esri, Maxar, Earthstar Geographics, and the GIS User Community',
};

export const AKTIVE_KARTENQUELLE = ESRI_WORLD_IMAGERY;
