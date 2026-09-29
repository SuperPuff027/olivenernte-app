/** Kartenausschnitt, der zwischen App-Starts erhalten bleibt. */
export interface Ansicht {
  lon: number;
  lat: number;
  zoom: number;
}

/** Prüft einen gespeicherten Wert; liefert null bei ungültigen Daten. */
export function pruefeAnsicht(wert: unknown): Ansicht | null {
  if (typeof wert !== 'object' || wert === null) return null;
  const { lon, lat, zoom } = wert as Record<string, unknown>;
  if (typeof lon !== 'number' || typeof lat !== 'number' || typeof zoom !== 'number') return null;
  if (![lon, lat, zoom].every(Number.isFinite)) return null;
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90 || zoom < 0 || zoom > 24) return null;
  return { lon, lat, zoom };
}
