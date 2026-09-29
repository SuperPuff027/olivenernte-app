import { describe, expect, it } from 'vitest';
import { abstandM, MAX_FIX_GENAUIGKEIT_M, MIN_FIXES, mittele, zielErreicht, type GpsFix } from './gpsMittel';

// Beliebiger Bezugspunkt; Fixes werden in Metern Versatz angegeben.
const BASIS = { lat: 20, lon: 10 };
const GRAD_PRO_M = 180 / (Math.PI * 6_371_000);

function fix(ostM: number, nordM: number, genauigkeit_m: number, zeit_s: number): GpsFix {
  return {
    lat: BASIS.lat + nordM * GRAD_PRO_M,
    lon: BASIS.lon + (ostM * GRAD_PRO_M) / Math.cos((BASIS.lat * Math.PI) / 180),
    genauigkeit_m,
    zeit_ms: 1_000_000 + zeit_s * 1000,
  };
}

/** n Fixes am selben Ort, gleichmäßig über dauer_s verteilt */
function reihe(n: number, genauigkeit_m: number, dauer_s: number, ort: [number, number] = [0, 0]): GpsFix[] {
  return Array.from({ length: n }, (_, i) => fix(ort[0], ort[1], genauigkeit_m, n > 1 ? (i * dauer_s) / (n - 1) : 0));
}

describe('abstandM', () => {
  it('rechnet Grad in Meter um', () => {
    expect(abstandM(BASIS, { lat: 20.001, lon: 10 })).toBeCloseTo(111.19, 1);
    expect(abstandM(BASIS, fix(30, 40, 1, 0))).toBeCloseTo(50, 3);
  });
});

describe('mittele', () => {
  it('ohne Fixes: kein Ergebnis', () => {
    expect(mittele([])).toEqual({ punkt: null, genauigkeit_m: null, verwendet: 0, verworfen: 0 });
  });

  it('verwirft zu ungenaue und ungültige Fixes', () => {
    const m = mittele([
      fix(0, 0, MAX_FIX_GENAUIGKEIT_M + 1, 0),
      fix(0, 0, 65, 1),
      { lat: Number.NaN, lon: 10, genauigkeit_m: 5, zeit_ms: 2 },
      { lat: 20, lon: 10, genauigkeit_m: 0, zeit_ms: 3 },
    ]);
    expect(m).toEqual({ punkt: null, genauigkeit_m: null, verwendet: 0, verworfen: 4 });
  });

  it('ein Fix: seine Position und Genauigkeit', () => {
    const f = fix(3, 4, 6, 0);
    const m = mittele([f]);
    expect(m.punkt?.lat).toBeCloseTo(f.lat, 10);
    expect(m.punkt?.lon).toBeCloseTo(f.lon, 10);
    expect(m.genauigkeit_m).toBeCloseTo(6, 6);
  });

  it('gewichtet mit 1/Genauigkeit²', () => {
    // Gewichte 1/4 und 1/100: Mittel bei 10 · 0,01 / 0,26 ≈ 0,385 m Ost
    const m = mittele([fix(0, 0, 2, 0), fix(10, 0, 10, 1)]);
    expect(m.verwendet).toBe(2);
    expect(abstandM(BASIS, m.punkt!)).toBeCloseTo(10 * 0.01 / 0.26, 2);
  });

  it('verwirft Ausreißer', () => {
    const m = mittele([...reihe(6, 4, 30, [0.5, 0]), fix(50, 0, 4, 31)]);
    expect(m.verwendet).toBe(6);
    expect(m.verworfen).toBe(1);
    expect(abstandM(BASIS, m.punkt!)).toBeLessThan(1);
  });

  it('verwirft nie die Mehrheit', () => {
    const m = mittele([...reihe(2, 5, 10, [0, 0]), ...reihe(3, 5, 10, [40, 0])]);
    expect(m.verwendet).toBe(5);
  });

  it('zählt doppelt gemeldete Fixes nur einmal', () => {
    const f = fix(0, 0, 5, 0);
    expect(mittele([f, { ...f }, { ...f }])).toMatchObject({ verwendet: 1, verworfen: 0 });
  });

  it('kurz hintereinander gemessene Fixes verbessern die Genauigkeit kaum', () => {
    // 10 Fixes in 1 s sind praktisch ein einziger Messwert.
    expect(mittele(reihe(10, 5, 1)).genauigkeit_m).toBeGreaterThan(4);
  });

  it('über längere Zeit verteilte Fixes verbessern die Genauigkeit wie unabhängige Messungen', () => {
    // 10 Fixes über 60 s: 5 m / √10 ≈ 1,58 m
    expect(mittele(reihe(10, 5, 60)).genauigkeit_m).toBeCloseTo(5 / Math.sqrt(10), 2);
  });

  it('die Streuung der Fixes begrenzt die Genauigkeit nach unten', () => {
    // Gerät meldet 1 m, die Fixes springen aber ±3 m hin und her.
    const fixes = Array.from({ length: 20 }, (_, i) => fix(i % 2 === 0 ? 3 : -3, 0, 1, i * 5));
    const m = mittele(fixes);
    expect(m.verwendet).toBe(20);
    expect(m.genauigkeit_m).toBeCloseTo(3, 6);
  });
});

describe('zielErreicht', () => {
  it('braucht genug Fixes und die Zielgenauigkeit', () => {
    expect(zielErreicht(mittele(reihe(MIN_FIXES - 1, 2, 60)), 5)).toBe(false);
    expect(zielErreicht(mittele(reihe(MIN_FIXES, 2, 60)), 5)).toBe(true);
    expect(zielErreicht(mittele(reihe(MIN_FIXES, 20, 60)), 5)).toBe(false);
    expect(zielErreicht(mittele([]), 5)).toBe(false);
  });
});
