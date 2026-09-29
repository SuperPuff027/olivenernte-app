import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import { baumPunkte, innenfarbe, RING_OHNE_SORTE, ringfarbe, STATUS_FARBEN } from './farben';

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
      { id: '1', nummer: 'B-1', innen: STATUS_FARBEN.bereit, ring: '#1e88e5' },
      { id: '2', nummer: 'B-2', innen: STATUS_FARBEN.nicht_bereit, ring: RING_OHNE_SORTE },
      { id: '3', nummer: 'B-3', innen: STATUS_FARBEN.nicht_bereit, ring: RING_OHNE_SORTE },
    ]);
    expect(punkte.features[0]?.geometry.coordinates).toEqual([10, 20]);
    expect(punkte.features[0]?.id).toBe('1');
  });

  it('lässt gelöschte Bäume weg', () => {
    expect(baumPunkte([baum('1', null, true)], [], []).features).toEqual([]);
  });
});
