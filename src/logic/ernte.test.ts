import { describe, expect, it } from 'vitest';
import type { SaisonStatus } from '../model/typen';
import { neuerSaisonStatus } from './datensatz';
import { ernteAenderung, lokalesDatum } from './ernte';

const status = (weitere: Partial<SaisonStatus>): SaisonStatus => ({
  ...neuerSaisonStatus('b-1', 2026, new Date('2026-10-01T08:00:00Z')),
  ...weitere,
});

describe('lokalesDatum', () => {
  it('nach der Uhr des Geräts, zweistellig', () => {
    expect(lokalesDatum(new Date(2026, 9, 5, 0, 10))).toBe('2026-10-05');
    expect(lokalesDatum(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });
});

describe('ernteAenderung', () => {
  const HEUTE = new Date(2026, 9, 12, 9, 30);

  it('setzt Status, Ertrag und das heutige Datum', () => {
    expect(ernteAenderung(null, 38.5, HEUTE)).toEqual({ status: 'geerntet', ertrag_kg: 38.5, erntedatum: '2026-10-12' });
    expect(ernteAenderung(status({ status: 'bereit', fuellstand: 4 }), null, HEUTE)).toEqual({
      status: 'geerntet',
      ertrag_kg: null,
      erntedatum: '2026-10-12',
    });
  });

  it('bei schon geerntetem Baum bleibt das ursprüngliche Datum, der Ertrag wird ersetzt', () => {
    const vorher = status({ status: 'geerntet', ertrag_kg: 20, erntedatum: '2026-10-03' });
    expect(ernteAenderung(vorher, 25, HEUTE)).toEqual({ status: 'geerntet', ertrag_kg: 25, erntedatum: '2026-10-03' });
  });

  it('ein altes Erntedatum aus einem zurückgesetzten Status gilt nicht', () => {
    const vorher = status({ status: 'bereit', ertrag_kg: 20, erntedatum: '2026-10-03' });
    expect(ernteAenderung(vorher, 22, HEUTE).erntedatum).toBe('2026-10-12');
  });

  it('gelöschter Status zählt nicht als geerntet', () => {
    const vorher = status({ status: 'geerntet', erntedatum: '2026-10-03', geloescht: true });
    expect(ernteAenderung(vorher, 1, HEUTE).erntedatum).toBe('2026-10-12');
  });
});
