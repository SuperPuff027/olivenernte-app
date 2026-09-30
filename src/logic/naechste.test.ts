import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import { erstelleMerkmale, KEIN_FILTER, type BaumFilter } from './filter';
import { naechsteBaeume, richtung } from './naechste';

// Beliebiger Bezugspunkt; Bäume in Metern Versatz (Ost, Nord)
const BASIS = { lat: 20, lon: 10 };
const GRAD_PRO_M = 180 / (Math.PI * 6_371_000);
const bei = (ostM: number, nordM: number) => ({
  lat: BASIS.lat + nordM * GRAD_PRO_M,
  lon: BASIS.lon + (ostM * GRAD_PRO_M) / Math.cos((BASIS.lat * Math.PI) / 180),
});

const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
const baum = (nummer: string, sorte_id: string | null, ostM: number, nordM: number, geloescht = false): Baum => ({
  id: nummer,
  nummer,
  grundstueck_id: null,
  sorte_id,
  ...bei(ostM, nordM),
  gps_genauigkeit_m: null,
  hoehe_m: null,
  notiz: '',
  ...basis,
  geloescht,
});
const status = (baum_id: string, s: SaisonStatus['status']): SaisonStatus => ({
  baum_id,
  jahr: 2026,
  status: s,
  fuellstand: null,
  ertrag_kg: null,
  erntedatum: null,
  ...basis,
});
const sorten: Sorte[] = [
  { id: 'm', name: 'Memecik', ringfarbe: '#1e88e5', ...basis },
  { id: 'a', name: 'Ayvalık', ringfarbe: '#ff00ff', ...basis },
];

describe('richtung', () => {
  it('acht Himmelsrichtungen im Uhrzeigersinn', () => {
    const faelle: [number, number, string][] = [
      [0, 10, 'n'],
      [10, 10, 'no'],
      [10, 0, 'o'],
      [10, -10, 'so'],
      [0, -10, 's'],
      [-10, -10, 'sw'],
      [-10, 0, 'w'],
      [-10, 10, 'nw'],
      [2, 10, 'n'],
      [-2, 10, 'n'],
    ];
    for (const [ost, nord, erwartet] of faelle) expect(richtung(BASIS, bei(ost, nord))).toBe(erwartet);
  });
});

describe('naechsteBaeume', () => {
  const baeume = [
    baum('B-1', 'm', 30, 0),
    baum('B-2', 'm', 0, 10),
    baum('B-3', 'a', 5, 0),
    baum('B-4', 'm', -20, -20),
    baum('B-5', 'm', 1, 1, true),
    baum('B-6', 'm', 2, 0),
  ];
  const saison = [status('B-1', 'bereit'), status('B-2', 'bereit'), status('B-3', 'bereit'), status('B-6', 'geerntet')];
  const merkmale = erstelleMerkmale(sorten, saison);
  const nummern = (filter: BaumFilter, anzahl = 5, ausser: string | null = null) =>
    naechsteBaeume(BASIS, baeume, merkmale, filter, anzahl, ausser).map((t) => t.baum.nummer);

  it('sortiert nach Entfernung und überspringt Gelöschte und Geerntete', () => {
    expect(nummern(KEIN_FILTER)).toEqual(['B-3', 'B-2', 'B-4', 'B-1']);
  });

  it('liefert Entfernung und Richtung', () => {
    const [erster] = naechsteBaeume(BASIS, baeume, merkmale, KEIN_FILTER, 1);
    expect(erster?.baum.nummer).toBe('B-3');
    expect(erster?.abstandM).toBeCloseTo(5, 3);
    expect(erster?.richtung).toBe('o');
  });

  it('nur passende Bäume: Sorte und Status', () => {
    const f: BaumFilter = { sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: null };
    expect(nummern(f)).toEqual(['B-2', 'B-1']);
  });

  it('geerntete Bäume nur, wenn der Filter sie verlangt', () => {
    expect(nummern({ sorte: null, status: 'geerntet', fuellstand: null })).toEqual(['B-6']);
  });

  it('begrenzt die Anzahl und schließt den Bezugsbaum aus', () => {
    expect(nummern(KEIN_FILTER, 2)).toEqual(['B-3', 'B-2']);
    expect(nummern(KEIN_FILTER, 5, 'B-3')).toEqual(['B-2', 'B-4', 'B-1']);
    expect(nummern(KEIN_FILTER, 0)).toEqual([]);
  });

  it('leere Liste, wenn nichts passt', () => {
    expect(nummern({ sorte: { sorteId: 'unbekannt' }, status: null, fuellstand: null })).toEqual([]);
  });
});
