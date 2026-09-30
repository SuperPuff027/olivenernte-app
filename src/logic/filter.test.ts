import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import {
  istFilterAktiv,
  KEIN_FILTER,
  passtZuFilter,
  umschalteSorte,
  umschalteStatus,
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
    const mitStatus: BaumFilter = { sorte: null, status: 'bereit' };
    const m = umschalteSorte(mitStatus, 'm');
    expect(m).toEqual({ sorte: { sorteId: 'm' }, status: 'bereit' });
    expect(umschalteSorte(m, 'a')).toEqual({ sorte: { sorteId: 'a' }, status: 'bereit' });
    expect(umschalteSorte(m, 'm')).toEqual(mitStatus);
  });

  it('„ohne Sorte“ ist eine eigene Wahl', () => {
    expect(umschalteSorte(KEIN_FILTER, null)).toEqual({ sorte: { sorteId: null }, status: null });
    expect(umschalteSorte({ sorte: { sorteId: null }, status: null }, null)).toEqual(KEIN_FILTER);
  });

  it('Status setzen, wechseln und aufheben; Sorte bleibt', () => {
    const f = umschalteStatus({ sorte: { sorteId: 'm' }, status: null }, 'geerntet');
    expect(f).toEqual({ sorte: { sorteId: 'm' }, status: 'geerntet' });
    expect(umschalteStatus(f, 'bereit').status).toBe('bereit');
    expect(umschalteStatus(f, 'geerntet')).toEqual({ sorte: { sorteId: 'm' }, status: null });
  });

  it('aktiv, sobald Sorte oder Status gewählt ist', () => {
    expect(istFilterAktiv(KEIN_FILTER)).toBe(false);
    expect(istFilterAktiv({ sorte: null, status: 'bereit' })).toBe(true);
    expect(istFilterAktiv({ sorte: { sorteId: null }, status: null })).toBe(true);
  });
});

describe('passtZuFilter', () => {
  it('kein Filter passt immer, sonst muss alles Gewählte passen', () => {
    expect(passtZuFilter('m', 'bereit', KEIN_FILTER)).toBe(true);
    expect(passtZuFilter('m', 'bereit', { sorte: { sorteId: 'm' }, status: 'bereit' })).toBe(true);
    expect(passtZuFilter('m', 'geerntet', { sorte: { sorteId: 'm' }, status: 'bereit' })).toBe(false);
    expect(passtZuFilter(null, 'bereit', { sorte: { sorteId: 'm' }, status: null })).toBe(false);
    expect(passtZuFilter(null, 'bereit', { sorte: { sorteId: null }, status: null })).toBe(true);
  });
});

describe('zaehleTreffer', () => {
  const baeume = [baum('1', 'm'), baum('2', 'm'), baum('3', null), baum('4', 'weg'), baum('5', 'm', true)];
  const sorten = [sorte('m'), sorte('weg', true)];
  const st = [status('1', 'bereit'), status('3', 'bereit'), status('2', 'geerntet', true), status('5', 'bereit')];

  it('zählt aktive passende Bäume; ohne Eintrag gilt „nicht bereit“', () => {
    expect(zaehleTreffer(baeume, sorten, st, KEIN_FILTER)).toBe(4);
    expect(zaehleTreffer(baeume, sorten, st, { sorte: null, status: 'bereit' })).toBe(2);
    expect(zaehleTreffer(baeume, sorten, st, { sorte: null, status: 'nicht_bereit' })).toBe(2);
    expect(zaehleTreffer(baeume, sorten, st, { sorte: { sorteId: 'm' }, status: 'bereit' })).toBe(1);
    // Baum mit gelöschter Sorte zählt als „ohne Sorte“
    expect(zaehleTreffer(baeume, sorten, st, { sorte: { sorteId: null }, status: null })).toBe(2);
  });
});
