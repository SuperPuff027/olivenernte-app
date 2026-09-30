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
      ertrag: { kg: 0, geerntet: 0, ohneMenge: 0 },
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

describe('zaehleBaeume Ertrag', () => {
  const st = (baum_id: string, s: SaisonStatus['status'], ertrag_kg: number | null, geloescht = false): SaisonStatus => ({
    baum_id,
    jahr: 2026,
    status: s,
    fuellstand: null,
    ertrag_kg,
    erntedatum: '2026-10-10',
    ...basis,
    geloescht,
  });
  const baeume = [baum('1', 'm'), baum('2', 'm'), baum('3', 'a'), baum('4', null), baum('5', 'a'), baum('6', 'm', true)];
  const sorten = [sorte('m', 'Memecik'), sorte('a', 'Ayvalık')];
  const saison = [
    st('1', 'geerntet', 30.25),
    st('2', 'geerntet', null),
    st('3', 'geerntet', 12.1),
    // zurückgesetzt: Menge bleibt gespeichert, zählt aber nicht
    st('4', 'bereit', 99),
    // gelöschter Eintrag und gelöschter Baum zählen nicht
    st('5', 'geerntet', 50, true),
    st('6', 'geerntet', 70),
  ];
  const s = zaehleBaeume(baeume, sorten, 'de', saison);

  it('Gesamtertrag, Anzahl geerntet und ohne Menge', () => {
    expect(s.ertrag).toEqual({ kg: 42.4, geerntet: 3, ohneMenge: 1 });
  });

  it('Ertrag pro Sorte', () => {
    expect(s.proSorte.map((z) => `${z.sorte?.name ?? 'ohne'}=${z.ertragKg}`)).toEqual(['Ayvalık=12.1', 'Memecik=30.3', 'ohne=0']);
  });

  it('rundet die Summe auf 0,1 kg ohne Gleitkomma-Reste', () => {
    const viele = Array.from({ length: 10 }, (_, i) => baum(`x${i}`, null));
    const mengen = viele.map((b) => st(b.id, 'geerntet', 0.1));
    expect(zaehleBaeume(viele, [], 'de', mengen).ertrag.kg).toBe(1);
  });
});
