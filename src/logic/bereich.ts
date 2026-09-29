import { bbox } from '@turf/bbox';
import type { Baum, Grundstueck } from '../model/typen';

/** [West, Süd, Ost, Nord] in Grad */
export type Bereich = [number, number, number, number];

/** Bereich, der Grundstück und Bäume umfasst; null, wenn es nichts zu zeigen gibt. */
export function bereichVon(grundstueck: Grundstueck | null, baeume: readonly Baum[]): Bereich | null {
  const geometrien = [
    ...(grundstueck ? [grundstueck.polygon] : []),
    ...baeume.map((b) => ({ type: 'Point' as const, coordinates: [b.lon, b.lat] })),
  ];
  if (geometrien.length === 0) return null;
  const [west, sued, ost, nord] = bbox({ type: 'GeometryCollection', geometries: geometrien });
  return [west, sued, ost, nord];
}
