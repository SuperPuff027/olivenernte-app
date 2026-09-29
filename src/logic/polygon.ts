import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { kinks } from '@turf/kinks';
import type { GeoJsonPolygon, Position } from '../model/typen';

// Bearbeitung der Grundstücksgrenze als offener Ring (ohne wiederholten Schlusspunkt).

export type PolygonFehler = 'zu_wenige_punkte' | 'ueberschneidung';

const MIN_PUNKTE = 3;

function gleich(a: Position, b: Position): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Äußerer Ring ohne Schlusspunkt. */
export function offenerRing(polygon: GeoJsonPolygon): Position[] {
  const ring = polygon.coordinates[0] ?? [];
  const erster = ring[0];
  const letzter = ring[ring.length - 1];
  return ring.length > 1 && erster && letzter && gleich(erster, letzter) ? ring.slice(0, -1) : [...ring];
}

export function alsPolygon(ring: readonly Position[]): GeoJsonPolygon {
  const erster = ring[0];
  return { type: 'Polygon', coordinates: [erster ? [...ring, erster] : []] };
}

/** Quadrat des Abstands von p zur Strecke a–b in einer lokal längentreuen Ebene. */
function abstandZurStrecke2(p: Position, a: Position, b: Position, kosinus: number): number {
  const px = p[0] * kosinus, py = p[1];
  const ax = a[0] * kosinus, ay = a[1];
  const bx = b[0] * kosinus, by = b[1];
  const dx = bx - ax, dy = by - ay;
  const laenge2 = dx * dx + dy * dy;
  const t = laenge2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / laenge2));
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return qx * qx + qy * qy;
}

/**
 * Fügt einen Punkt ein: unter 3 Punkten am Ende, sonst in die nächstgelegene Kante
 * (inkl. der Schlusskante letzter→erster Punkt, sodass Weiterzeichnen am Ende anhängt).
 */
export function fuegePunktEin(ring: readonly Position[], punkt: Position): Position[] {
  if (ring.length < MIN_PUNKTE) return [...ring, punkt];
  const kosinus = Math.cos((punkt[1] * Math.PI) / 180);
  let besteKante = 0;
  let besterAbstand = Infinity;
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length]!;
    const abstand = abstandZurStrecke2(punkt, a, b, kosinus);
    // Bei Gleichstand gewinnt die spätere Kante (Schlusskante), damit angehängt wird.
    if (abstand <= besterAbstand) {
      besterAbstand = abstand;
      besteKante = i;
    }
  });
  return [...ring.slice(0, besteKante + 1), punkt, ...ring.slice(besteKante + 1)];
}

export function verschiebePunkt(ring: readonly Position[], index: number, punkt: Position): Position[] {
  return ring.map((p, i) => (i === index ? punkt : p));
}

export function entfernePunkt(ring: readonly Position[], index: number): Position[] {
  return ring.filter((_, i) => i !== index);
}

export function pruefeRing(ring: readonly Position[]): PolygonFehler | null {
  if (ring.length < MIN_PUNKTE) return 'zu_wenige_punkte';
  if (kinks(alsPolygon(ring)).features.length > 0) return 'ueberschneidung';
  return null;
}

/** Liegt der Punkt im Polygon? Punkte genau auf der Grenze zählen als innen. */
export function liegtImPolygon(punkt: Position, polygon: GeoJsonPolygon): boolean {
  return booleanPointInPolygon([punkt[0], punkt[1]], polygon);
}
