import { describe, expect, it } from 'vitest';
import type { Bereich } from './bereich';
import { kachelnFuerBereich, kachelUrl, mitPuffer } from './kacheln';

describe('kachelnFuerBereich', () => {
  it('liefert bei Zoom 0 genau eine Kachel', () => {
    expect(kachelnFuerBereich([-10, -10, 10, 10], 0, 0)).toEqual([{ z: 0, x: 0, y: 0 }]);
  });

  it('berechnet bekannte Kacheln (Nullpunkt bei Zoom 1 und 2)', () => {
    const umNullpunkt: Bereich = [-0.001, -0.001, 0.001, 0.001];
    expect(kachelnFuerBereich(umNullpunkt, 1, 1)).toEqual([
      { z: 1, x: 0, y: 0 },
      { z: 1, x: 0, y: 1 },
      { z: 1, x: 1, y: 0 },
      { z: 1, x: 1, y: 1 },
    ]);
    // Nordost-Viertel bei Zoom 2: x=2, y=1
    expect(kachelnFuerBereich([10, 10, 11, 11], 2, 2)).toEqual([{ z: 2, x: 2, y: 1 }]);
  });

  it('bleibt für ein kleines Grundstück bei wenigen Kacheln', () => {
    // Beliebige Testposition, ca. 500 m × 300 m
    const bereich: Bereich = [10, 20, 10.0048, 20.0027];
    const kacheln = kachelnFuerBereich(mitPuffer(bereich, 100), 12, 18);
    expect(kacheln.length).toBeGreaterThan(7);
    expect(kacheln.length).toBeLessThan(100);
    expect(new Set(kacheln.map((k) => k.z))).toEqual(new Set([12, 13, 14, 15, 16, 17, 18]));
  });

  it('bleibt an den Rändern der Welt gültig', () => {
    for (const k of kachelnFuerBereich([-180, -90, 180, 90], 2, 2)) {
      expect(k.x).toBeGreaterThanOrEqual(0);
      expect(k.x).toBeLessThan(4);
      expect(k.y).toBeGreaterThanOrEqual(0);
      expect(k.y).toBeLessThan(4);
    }
    expect(kachelnFuerBereich([-180, -90, 180, 90], 2, 2)).toHaveLength(16);
  });
});

describe('mitPuffer', () => {
  it('vergrößert den Bereich um etwa die angegebenen Meter', () => {
    const [w, s, o, n] = mitPuffer([10, 0, 10, 0], 111.32);
    expect(n - s).toBeCloseTo(0.002, 6);
    expect(o - w).toBeCloseTo(0.002, 6); // am Äquator gleich
  });

  it('berücksichtigt die Breite bei der Länge', () => {
    const [w, , o] = mitPuffer([10, 60, 10, 60], 111.32);
    expect(o - w).toBeCloseTo(0.004, 4); // cos(60°) = 0,5
  });
});

describe('kachelUrl', () => {
  it('setzt z, x, y in die Vorlage ein', () => {
    expect(kachelUrl('https://beispiel/tile/{z}/{y}/{x}', { z: 18, x: 5, y: 7 })).toBe('https://beispiel/tile/18/7/5');
  });
});
