import { describe, expect, it } from 'vitest';
import type { Position } from '../model/typen';
import { alsPolygon, entfernePunkt, fuegePunktEin, offenerRing, pruefeRing, verschiebePunkt } from './polygon';

// Beliebige Testkoordinaten: Quadrat 0,01° × 0,01°
const A: Position = [10, 20];
const B: Position = [10.01, 20];
const C: Position = [10.01, 20.01];
const D: Position = [10, 20.01];

describe('offenerRing / alsPolygon', () => {
  it('entfernt und ergänzt den Schlusspunkt', () => {
    const polygon = alsPolygon([A, B, C]);
    expect(polygon.coordinates[0]).toEqual([A, B, C, A]);
    expect(offenerRing(polygon)).toEqual([A, B, C]);
  });

  it('behält Höhenwerte', () => {
    const mitHoehe: Position = [10, 20, 55];
    expect(offenerRing(alsPolygon([mitHoehe, B, C]))[0]).toEqual([10, 20, 55]);
  });

  it('kommt mit leeren und offenen Ringen zurecht', () => {
    expect(alsPolygon([]).coordinates[0]).toEqual([]);
    expect(offenerRing({ type: 'Polygon', coordinates: [[A, B, C]] })).toEqual([A, B, C]);
    expect(offenerRing({ type: 'Polygon', coordinates: [] })).toEqual([]);
  });
});

describe('fuegePunktEin', () => {
  it('hängt beim Zeichnen die ersten Punkte an', () => {
    expect(fuegePunktEin(fuegePunktEin([], A), B)).toEqual([A, B]);
  });

  it('fügt einen Punkt in die nächstgelegene Kante ein', () => {
    const mitteUnten: Position = [10.005, 19.999]; // nahe Kante A–B
    expect(fuegePunktEin([A, B, C, D], mitteUnten)).toEqual([A, mitteUnten, B, C, D]);
    const rechts: Position = [10.011, 20.005]; // nahe Kante B–C
    expect(fuegePunktEin([A, B, C, D], rechts)).toEqual([A, B, rechts, C, D]);
  });

  it('hängt nahe der Schlusskante am Ende an', () => {
    const links: Position = [9.999, 20.005]; // nahe Kante D–A
    expect(fuegePunktEin([A, B, C, D], links)).toEqual([A, B, C, D, links]);
  });
});

describe('verschiebePunkt / entfernePunkt', () => {
  it('ändert nur den gewählten Punkt', () => {
    const neu: Position = [10.02, 20.02];
    const ring = [A, B, C];
    expect(verschiebePunkt(ring, 2, neu)).toEqual([A, B, neu]);
    expect(entfernePunkt(ring, 1)).toEqual([A, C]);
    expect(ring).toEqual([A, B, C]);
  });
});

describe('pruefeRing', () => {
  it('verlangt mindestens 3 Punkte', () => {
    expect(pruefeRing([A, B])).toBe('zu_wenige_punkte');
    expect(pruefeRing([A, B, C])).toBeNull();
  });

  it('erkennt Selbstüberschneidung', () => {
    expect(pruefeRing([A, C, B, D])).toBe('ueberschneidung'); // „Schleife“
    expect(pruefeRing([A, B, C, D])).toBeNull();
  });
});
