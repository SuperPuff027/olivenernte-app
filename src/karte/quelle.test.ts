import { describe, expect, it } from 'vitest';
import { AKTIVE_BESCHRIFTUNG, AKTIVE_KARTENQUELLE, KACHELQUELLEN } from './quelle';

describe('Kachelquellen', () => {
  it('Luftbild und Beschriftung haben eigene Caches und unterscheidbare URL-Präfixe', () => {
    expect(KACHELQUELLEN[0]).toBe(AKTIVE_KARTENQUELLE);
    expect(new Set(KACHELQUELLEN.map((q) => q.cacheName)).size).toBe(KACHELQUELLEN.length);
    for (const a of KACHELQUELLEN) {
      for (const b of KACHELQUELLEN) {
        if (a !== b) expect(a.kachelUrlPraefix.startsWith(b.kachelUrlPraefix)).toBe(false);
      }
      expect(a.kachelUrl.startsWith(a.kachelUrlPraefix)).toBe(true);
      expect(a.kachelUrl).toMatch(/\{z\}.*\{y\}.*\{x\}|\{z\}.*\{x\}.*\{y\}/);
    }
  });

  it('Ortsnamen verschwinden nah am Hain, bevor die Kacheln leer werden', () => {
    expect(AKTIVE_BESCHRIFTUNG).not.toBeNull();
    const b = AKTIVE_BESCHRIFTUNG!;
    expect(b.sichtbarBisZoom).toBeGreaterThan(b.maxZoom);
    expect(b.sichtbarBisZoom).toBeLessThanOrEqual(b.maxZoom + 1);
  });
});
