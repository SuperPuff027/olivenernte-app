import { describe, expect, it } from 'vitest';
import type { Baum, Grundstueck } from '../model/typen';
import { bereichVon } from './bereich';

// Beliebige Testkoordinaten
const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
const grundstueck: Grundstueck = {
  id: 'g',
  name: 'Test',
  polygon: { type: 'Polygon', coordinates: [[[10, 20, 5], [10.02, 20], [10.02, 20.01], [10, 20, 5]]] },
  ...basis,
};
const baum = (lon: number, lat: number) => ({ lon, lat }) as Baum;

describe('bereichVon', () => {
  it('liefert null ohne Daten', () => {
    expect(bereichVon(null, [])).toBeNull();
  });

  it('umfasst das Grundstück', () => {
    expect(bereichVon(grundstueck, [])).toEqual([10, 20, 10.02, 20.01]);
  });

  it('umfasst auch Bäume außerhalb des Grundstücks', () => {
    expect(bereichVon(grundstueck, [baum(9.99, 20.005)])).toEqual([9.99, 20, 10.02, 20.01]);
  });

  it('funktioniert mit Bäumen allein', () => {
    expect(bereichVon(null, [baum(10, 20), baum(10.01, 20.02)])).toEqual([10, 20, 10.01, 20.02]);
  });
});
