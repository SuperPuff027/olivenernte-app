import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import {
  baumPunkte,
  FILTER_DECKKRAFT,
  FILTER_VERGROESSERUNG,
  innenfarbe,
  RING_OHNE_SORTE,
  ringfarbe,
  STATUS_FARBEN,
} from './farben';
import { KEIN_FILTER, type BaumFilter } from './filter';

const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
const sorte = (id: string, ringfarbe: string, geloescht = false): Sorte => ({ id, name: id, ringfarbe, ...basis, geloescht });
// Beliebige Testkoordinaten
const baum = (id: string, sorte_id: string | null, geloescht = false): Baum => ({
  id,
  nummer: `B-${id}`,
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

describe('innenfarbe', () => {
  it('bereit grün, nicht bereit rot, geerntet grau', () => {
    expect(innenfarbe('bereit')).toBe(STATUS_FARBEN.bereit);
    expect(innenfarbe('nicht_bereit')).toBe(STATUS_FARBEN.nicht_bereit);
    expect(innenfarbe('geerntet')).toBe(STATUS_FARBEN.geerntet);
  });

  it('ohne Status wie nicht bereit', () => {
    expect(innenfarbe(null)).toBe(STATUS_FARBEN.nicht_bereit);
    expect(innenfarbe(undefined)).toBe(STATUS_FARBEN.nicht_bereit);
  });

  it('die drei Statusfarben sind verschieden und nicht weiß', () => {
    const farben = Object.values(STATUS_FARBEN);
    expect(new Set(farben).size).toBe(3);
    expect(farben).not.toContain(RING_OHNE_SORTE);
  });
});

describe('ringfarbe', () => {
  it('nimmt die Farbe der Sorte', () => {
    expect(ringfarbe(sorte('m', '#1e88e5'))).toBe('#1e88e5');
  });

  it('weiß ohne Sorte, bei gelöschter Sorte oder ungültiger Farbe', () => {
    expect(ringfarbe(null)).toBe(RING_OHNE_SORTE);
    expect(ringfarbe(sorte('m', '#1e88e5', true))).toBe(RING_OHNE_SORTE);
    expect(ringfarbe(sorte('m', 'blau'))).toBe(RING_OHNE_SORTE);
  });
});

describe('baumPunkte', () => {
  it('erzeugt Punkte mit Status- und Sortenfarbe', () => {
    const punkte = baumPunkte(
      [baum('1', 'm'), baum('2', null), baum('3', 'weg')],
      [sorte('m', '#1e88e5')],
      [status('1', 'bereit'), status('2', 'geerntet', true)],
    );
    expect(punkte.features.map((f) => f.properties)).toEqual([
      { id: '1', nummer: 'B-1', innen: STATUS_FARBEN.bereit, ring: '#1e88e5', deckkraft: 1, groesse: 1 },
      { id: '2', nummer: 'B-2', innen: STATUS_FARBEN.nicht_bereit, ring: RING_OHNE_SORTE, deckkraft: 1, groesse: 1 },
      { id: '3', nummer: 'B-3', innen: STATUS_FARBEN.nicht_bereit, ring: RING_OHNE_SORTE, deckkraft: 1, groesse: 1 },
    ]);
    expect(punkte.features[0]?.geometry.coordinates).toEqual([10, 20]);
    expect(punkte.features[0]?.id).toBe('1');
  });

  it('lässt gelöschte Bäume weg', () => {
    expect(baumPunkte([baum('1', null, true)], [], []).features).toEqual([]);
  });
});

describe('baumPunkte mit Sortenfilter', () => {
  const baeume = [baum('1', 'm'), baum('2', 'a'), baum('3', null), baum('4', 'weg'), baum('5', 'geloescht')];
  const sorten = [sorte('m', '#1e88e5'), sorte('a', '#ffd600'), sorte('geloescht', '#000000', true)];
  const darstellung = (filter: BaumFilter, status: SaisonStatus[] = []) =>
    baumPunkte(baeume, sorten, status, filter).features.map((f) => `${f.id}:${f.properties.deckkraft}/${f.properties.groesse}`);
  const hell = `${FILTER_DECKKRAFT}/1`;
  const gross = `1/${FILTER_VERGROESSERUNG}`;

  it('ohne Filter alle normal', () => {
    expect(darstellung(KEIN_FILTER)).toEqual(['1:1/1', '2:1/1', '3:1/1', '4:1/1', '5:1/1']);
  });

  it('gewählte Sorte größer, alle anderen durchsichtig', () => {
    expect(darstellung({ sorte: { sorteId: 'm' }, status: null, fuellstand: null })).toEqual([`1:${gross}`, `2:${hell}`, `3:${hell}`, `4:${hell}`, `5:${hell}`]);
  });

  it('Filter „ohne Sorte“ trifft auch Bäume mit gelöschter oder unbekannter Sorte', () => {
    expect(darstellung({ sorte: { sorteId: null }, status: null, fuellstand: null })).toEqual([`1:${hell}`, `2:${hell}`, `3:${gross}`, `4:${gross}`, `5:${gross}`]);
  });

  it('nach Status: ohne Eintrag zählt ein Baum als nicht bereit', () => {
    const st = [status('1', 'bereit'), status('2', 'geerntet')];
    expect(darstellung({ sorte: null, status: 'bereit', fuellstand: null }, st)).toEqual([`1:${gross}`, `2:${hell}`, `3:${hell}`, `4:${hell}`, `5:${hell}`]);
    expect(darstellung({ sorte: null, status: 'nicht_bereit', fuellstand: null }, st)).toEqual([`1:${hell}`, `2:${hell}`, `3:${gross}`, `4:${gross}`, `5:${gross}`]);
  });

  it('Sorte und Status zusammen: beides muss passen', () => {
    const st = [status('1', 'bereit'), status('2', 'bereit')];
    expect(darstellung({ sorte: { sorteId: 'm' }, status: 'bereit', fuellstand: null }, st)).toEqual([`1:${gross}`, `2:${hell}`, `3:${hell}`, `4:${hell}`, `5:${hell}`]);
    expect(darstellung({ sorte: { sorteId: 'a' }, status: 'geerntet', fuellstand: null }, st)).toEqual([`1:${hell}`, `2:${hell}`, `3:${hell}`, `4:${hell}`, `5:${hell}`]);
  });

  it('60 % durchsichtig, 10 % größer', () => {
    expect(FILTER_DECKKRAFT).toBeCloseTo(0.4);
    expect(FILTER_VERGROESSERUNG).toBeCloseTo(1.1);
  });
});
