import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import {
  istFilterAktiv,
  KEIN_FILTER,
  passtZuFilter,
  pruefeFilter,
  setzeFuellstand,
  umschalteSorte,
  umschalteStatus,
  vorschlagFuellstand,
  zaehleTreffer,
  type BaumFilter,
} from './filter';

const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
// Beliebige Testposition
const baum = (id: string, sorte_id: string | null, geloescht = false): Baum => ({
  id,
  nummer: id,
  grundstueck_id: null,
  sorte_id,
  lat: 20,
  lon: 10,
  gps_genauigkeit_m: null,
  hoehe_m: null,
  notiz: '',
  ...basis,
  geloescht,
});
const sorte = (id: string, geloescht = false): Sorte => ({ id, name: id, ringfarbe: '#1e88e5', ...basis, geloescht });
const status = (baum_id: string, s: SaisonStatus['status'], geloescht = false): SaisonStatus => ({
  baum_id,
  jahr: 2026,
  status: s,
  fuellstand: null,
  ertrag_kg: null,
  erntedatum: null,
  ...basis,
  geloescht,
});

describe('Filter umschalten', () => {
  it('Sorte setzen, wechseln und durch erneutes Antippen aufheben; Status bleibt', () => {
    const mitStatus: BaumFilter = { sorte: null, status: 'bereit', fuellstand: null };
    const m = umschalteSorte(mitStatus, 'm');
    expect(m).toEqual({ sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: null });
    expect(umschalteSorte(m, 'a')).toEqual({ sorte: { sorteId: 'a' }, status: 'bereit', fuellstand: null });
    expect(umschalteSorte(m, 'm')).toEqual(mitStatus);
  });

  it('„ohne Sorte“ ist eine eigene Wahl', () => {
    expect(umschalteSorte(KEIN_FILTER, null)).toEqual({ sorte: { sorteId: null }, status: null, fuellstand: null });
    expect(umschalteSorte({ sorte: { sorteId: null }, status: null, fuellstand: null }, null)).toEqual(KEIN_FILTER);
  });

  it('Status setzen, wechseln und aufheben; Sorte bleibt', () => {
    const f = umschalteStatus({ sorte: { sorteId: 'm' }, status: null, fuellstand: null }, 'geerntet');
    expect(f).toEqual({ sorte: { sorteId: 'm' }, status: 'geerntet', fuellstand: null });
    expect(umschalteStatus(f, 'bereit').status).toBe('bereit');
    expect(umschalteStatus(f, 'geerntet')).toEqual({ sorte: { sorteId: 'm' }, status: null, fuellstand: null });
  });

  it('aktiv, sobald Sorte oder Status gewählt ist', () => {
    expect(istFilterAktiv(KEIN_FILTER)).toBe(false);
    expect(istFilterAktiv({ sorte: null, status: 'bereit', fuellstand: null })).toBe(true);
    expect(istFilterAktiv({ sorte: { sorteId: null }, status: null, fuellstand: null })).toBe(true);
  });
});

describe('passtZuFilter', () => {
  const m = (sorteId: string | null, s: SaisonStatus['status'], fuellstand: number | null = null) => ({
    sorteId,
    status: s,
    fuellstand,
  });

  it('kein Filter passt immer, sonst muss alles Gewählte passen', () => {
    expect(passtZuFilter(m('m', 'bereit'), KEIN_FILTER)).toBe(true);
    expect(passtZuFilter(m('m', 'bereit'), { sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: null })).toBe(true);
    expect(passtZuFilter(m('m', 'geerntet'), { sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: null })).toBe(false);
    expect(passtZuFilter(m(null, 'bereit'), { sorte: { sorteId: 'm' }, status: null, fuellstand: null })).toBe(false);
    expect(passtZuFilter(m(null, 'bereit'), { sorte: { sorteId: null }, status: null, fuellstand: null })).toBe(true);
  });

  it('Füllstand-Bereich einschließlich der Grenzen; ohne Schätzung passt nicht', () => {
    const f: BaumFilter = { sorte: null, status: null, fuellstand: { von: 3, bis: 4 } };
    expect([1, 2, 3, 4, 5].map((n) => passtZuFilter(m('m', 'bereit', n), f))).toEqual([false, false, true, true, false]);
    expect(passtZuFilter(m('m', 'bereit', null), f)).toBe(false);
  });

  it('Füllstand zusammen mit Sorte und Status', () => {
    const f: BaumFilter = { sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: { von: 4, bis: 5 } };
    expect(passtZuFilter(m('m', 'bereit', 5), f)).toBe(true);
    expect(passtZuFilter(m('m', 'nicht_bereit', 5), f)).toBe(false);
    expect(passtZuFilter(m('a', 'bereit', 5), f)).toBe(false);
    expect(passtZuFilter(m('m', 'bereit', 3), f)).toBe(false);
  });
});

describe('setzeFuellstand', () => {
  it('begrenzt auf 1 … max, rundet und tauscht von/bis', () => {
    expect(setzeFuellstand(KEIN_FILTER, { von: 3, bis: 5 }, 5).fuellstand).toEqual({ von: 3, bis: 5 });
    expect(setzeFuellstand(KEIN_FILTER, { von: 5, bis: 2 }, 5).fuellstand).toEqual({ von: 2, bis: 5 });
    expect(setzeFuellstand(KEIN_FILTER, { von: 0, bis: 9 }, 5).fuellstand).toEqual({ von: 1, bis: 5 });
    expect(setzeFuellstand(KEIN_FILTER, { von: 2.6, bis: Number.NaN }, 5).fuellstand).toEqual({ von: 1, bis: 3 });
  });

  it('null hebt nur den Füllstand auf, Sorte und Status bleiben', () => {
    const f: BaumFilter = { sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: { von: 3, bis: 5 } };
    expect(setzeFuellstand(f, null, 5)).toEqual({ sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: null });
    expect(istFilterAktiv(setzeFuellstand(KEIN_FILTER, { von: 1, bis: 5 }, 5))).toBe(true);
  });

  it('Vorschlag: obere Hälfte der Stufen', () => {
    expect(vorschlagFuellstand(5)).toEqual({ von: 3, bis: 5 });
    expect(vorschlagFuellstand(10)).toEqual({ von: 6, bis: 10 });
    expect(vorschlagFuellstand(2)).toEqual({ von: 2, bis: 2 });
  });
});

describe('zaehleTreffer', () => {
  const baeume = [baum('1', 'm'), baum('2', 'm'), baum('3', null), baum('4', 'weg'), baum('5', 'm', true)];
  const sorten = [sorte('m'), sorte('weg', true)];
  const st = [status('1', 'bereit'), status('3', 'bereit'), status('2', 'geerntet', true), status('5', 'bereit')];

  it('zählt aktive passende Bäume; ohne Eintrag gilt „nicht bereit“', () => {
    expect(zaehleTreffer(baeume, sorten, st, KEIN_FILTER)).toBe(4);
    expect(zaehleTreffer(baeume, sorten, st, { sorte: null, status: 'bereit', fuellstand: null })).toBe(2);
    expect(zaehleTreffer(baeume, sorten, st, { sorte: null, status: 'nicht_bereit', fuellstand: null })).toBe(2);
    expect(zaehleTreffer(baeume, sorten, st, { sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: null })).toBe(1);
    // Baum mit gelöschter Sorte zählt als „ohne Sorte“
    expect(zaehleTreffer(baeume, sorten, st, { sorte: { sorteId: null }, status: null, fuellstand: null })).toBe(2);
  });

  it('zählt nach Füllstand aus dem Saisonstatus', () => {
    const mitFuellstand = [{ ...status('1', 'bereit'), fuellstand: 4 }, { ...status('2', 'bereit'), fuellstand: 2 }, status('3', 'bereit')];
    const f: BaumFilter = { sorte: null, status: null, fuellstand: { von: 3, bis: 5 } };
    expect(zaehleTreffer(baeume, sorten, mitFuellstand, f)).toBe(1);
  });
});

describe('pruefeFilter', () => {
  it('übernimmt einen gültigen Filter unverändert (auch nach JSON)', () => {
    const f: BaumFilter = { sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: { von: 3, bis: 5 } };
    expect(pruefeFilter(JSON.parse(JSON.stringify(f)))).toEqual(f);
    expect(pruefeFilter({ sorte: { sorteId: null }, status: null, fuellstand: null })).toEqual({
      sorte: { sorteId: null },
      status: null,
      fuellstand: null,
    });
  });

  it('ganz ungültige Daten ergeben keinen Filter', () => {
    for (const wert of [null, undefined, 'bereit', 42, [], { unbekannt: true }]) {
      expect(pruefeFilter(wert)).toEqual(KEIN_FILTER);
    }
  });

  it('verwirft nur ungültige Teile', () => {
    expect(pruefeFilter({ sorte: { sorteId: 7 }, status: 'bereit', fuellstand: null })).toEqual({
      sorte: null,
      status: 'bereit',
      fuellstand: null,
    });
    expect(pruefeFilter({ sorte: { sorteId: 'm' }, status: 'reif', fuellstand: { von: 4, bis: 2 } })).toEqual({
      sorte: { sorteId: 'm' },
      status: null,
      fuellstand: null,
    });
    expect(pruefeFilter({ status: null, fuellstand: { von: 1.5, bis: 3 } }).fuellstand).toBeNull();
    expect(pruefeFilter({ fuellstand: { von: 0, bis: 3 } }).fuellstand).toBeNull();
    expect(pruefeFilter({ sorte: { sorteId: '' } }).sorte).toBeNull();
  });
});
