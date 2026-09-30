import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import { zaehleBaeume } from './statistik';

const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
const sorte = (id: string, name: string, geloescht = false): Sorte => ({ id, name, ringfarbe: '#1e88e5', ...basis, geloescht });
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
const kurz = (s: ReturnType<typeof zaehleBaeume>) => s.proSorte.map((z) => `${z.sorte?.name ?? 'ohne'}=${z.anzahl}`);

describe('zaehleBaeume', () => {
  it('ohne Bäume und Sorten', () => {
    expect(zaehleBaeume([], [], 'de')).toEqual({
      gesamt: 0,
      proSorte: [],
      proStatus: [
        { status: 'nicht_bereit', anzahl: 0 },
        { status: 'bereit', anzahl: 0 },
        { status: 'geerntet', anzahl: 0 },
      ],
    });
  });

  it('zählt gesamt und pro Sorte, sortiert nach Namen, „ohne Sorte“ zuletzt', () => {
    const s = zaehleBaeume(
      [baum('1', 'm'), baum('2', 'm'), baum('3', 'a'), baum('4', null)],
      [sorte('m', 'Memecik'), sorte('a', 'Ayvalık'), sorte('g', 'Gemlik')],
      'de',
    );
    expect(s.gesamt).toBe(4);
    expect(kurz(s)).toEqual(['Ayvalık=1', 'Gemlik=0', 'Memecik=2', 'ohne=1']);
  });

  it('lässt gelöschte Bäume und Sorten weg; Bäume gelöschter oder unbekannter Sorten zählen als ohne Sorte', () => {
    const s = zaehleBaeume(
      [baum('1', 'm'), baum('2', 'weg'), baum('3', 'unbekannt'), baum('4', 'm', true)],
      [sorte('m', 'Memecik'), sorte('weg', 'Alt', true)],
      'de',
    );
    expect(s.gesamt).toBe(3);
    expect(kurz(s)).toEqual(['Memecik=1', 'ohne=2']);
  });

  it('die Summe pro Sorte ergibt immer die Gesamtzahl', () => {
    const s = zaehleBaeume([baum('1', 'a'), baum('2', null), baum('3', 'x')], [sorte('a', 'A')], 'de');
    expect(s.proSorte.reduce((summe, z) => summe + z.anzahl, 0)).toBe(s.gesamt);
  });

  it('sortiert in der Sprache (türkisch: I vor İ)', () => {
    const s = zaehleBaeume([], [sorte('b', 'İzmir'), sorte('a', 'Ilgaz')], 'tr');
    expect(kurz(s)).toEqual(['Ilgaz=0', 'İzmir=0']);
  });
});

describe('zaehleBaeume pro Status', () => {
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

  it('zählt je Status; ohne oder mit gelöschtem Eintrag gilt „nicht bereit“', () => {
    const s = zaehleBaeume(
      [baum('1', null), baum('2', null), baum('3', null), baum('4', null), baum('5', null, true)],
      [],
      'de',
      [status('1', 'bereit'), status('2', 'geerntet'), status('3', 'bereit', true), status('5', 'bereit')],
    );
    expect(s.proStatus).toEqual([
      { status: 'nicht_bereit', anzahl: 2 },
      { status: 'bereit', anzahl: 1 },
      { status: 'geerntet', anzahl: 1 },
    ]);
    expect(s.proStatus.reduce((summe, z) => summe + z.anzahl, 0)).toBe(s.gesamt);
  });
});
