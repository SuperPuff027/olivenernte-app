import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import { baeumeNachErtrag, ernten, ertragProSorteUndJahr, fuellstandGegenErtrag } from './auswertung';

const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
// Beliebige Testposition
const baum = (nummer: string, sorte_id: string | null, geloescht = false): Baum => ({
  id: nummer,
  nummer,
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
const sorten: Sorte[] = [
  { id: 'm', name: 'Memecik', ringfarbe: '#1e88e5', ...basis },
  { id: 'a', name: 'Ayvalık', ringfarbe: '#ff00ff', ...basis },
  { id: 'g', name: 'Gemlik', ringfarbe: '#795548', ...basis },
];
const ernte = (
  baum_id: string,
  jahr: number,
  ertrag_kg: number | null,
  fuellstand: number | null = null,
  weitere: Partial<SaisonStatus> = {},
): SaisonStatus => ({
  baum_id,
  jahr,
  status: 'geerntet',
  fuellstand,
  ertrag_kg,
  erntedatum: `${jahr}-11-01`,
  ...basis,
  ...weitere,
});

const baeume = [baum('B-1', 'm'), baum('B-2', 'm'), baum('B-3', 'a'), baum('B-4', null), baum('B-5', 'm', true)];
const status = [
  ernte('B-1', 2025, 30, 4),
  ernte('B-2', 2025, 20.25, 3),
  ernte('B-3', 2025, 12, 2),
  ernte('B-1', 2026, 40, 5),
  ernte('B-2', 2026, 18, 3),
  ernte('B-4', 2026, 7, 1),
  // zählen nicht: ohne Menge, nicht geerntet, gelöschter Eintrag, gelöschter Baum
  ernte('B-3', 2026, null, 2),
  ernte('B-3', 2024, 99, 5, { status: 'bereit' }),
  ernte('B-2', 2024, 50, 5, { geloescht: true }),
  ernte('B-5', 2026, 60, 5),
];
const alle = ernten(baeume, sorten, status);

describe('ernten', () => {
  it('nur aktive Bäume, Status geerntet, mit Menge', () => {
    expect(alle.map((e) => `${e.baum.nummer}/${e.jahr}`).sort()).toEqual([
      'B-1/2025',
      'B-1/2026',
      'B-2/2025',
      'B-2/2026',
      'B-3/2025',
      'B-4/2026',
    ]);
  });
});

describe('ertragProSorteUndJahr', () => {
  const t = ertragProSorteUndJahr(alle, sorten, 'de');

  it('Jahre neueste zuerst, nur Sorten mit Ertrag, „ohne Sorte“ zuletzt', () => {
    expect(t.jahre).toEqual([2026, 2025]);
    expect(t.zeilen.map((z) => z.sorte?.name ?? 'ohne')).toEqual(['Ayvalık', 'Memecik', 'ohne']);
  });

  it('Summen je Sorte und Jahr mit Anzahl Bäume, gerundet', () => {
    const memecik = t.zeilen.find((z) => z.sorte?.id === 'm')!;
    expect(memecik.proJahr.get(2025)).toEqual({ kg: 50.3, baeume: 2 });
    expect(memecik.proJahr.get(2026)).toEqual({ kg: 58, baeume: 2 });
    expect(t.zeilen.find((z) => z.sorte?.id === 'a')!.proJahr.get(2026)).toBeUndefined();
    expect(t.summeProJahr.get(2025)).toEqual({ kg: 62.3, baeume: 3 });
    expect(t.summeProJahr.get(2026)).toEqual({ kg: 65, baeume: 3 });
  });

  it('leer ohne Ernten', () => {
    expect(ertragProSorteUndJahr([], sorten, 'de')).toEqual({ jahre: [], zeilen: [], summeProJahr: new Map() });
  });
});

describe('baeumeNachErtrag', () => {
  it('stärkste und schwächste einer Saison', () => {
    const r = baeumeNachErtrag(alle, 2026, 1);
    expect(r.staerkste.map((b) => `${b.baum.nummer}=${b.kg}`)).toEqual(['B-1=40']);
    expect(r.schwaechste.map((b) => `${b.baum.nummer}=${b.kg}`)).toEqual(['B-4=7']);
  });

  it('keine Überschneidung bei wenigen Bäumen', () => {
    const r = baeumeNachErtrag(alle, 2026, 5);
    expect(r.staerkste.map((b) => b.baum.nummer)).toEqual(['B-1', 'B-2', 'B-4']);
    expect(r.schwaechste).toEqual([]);
    expect(baeumeNachErtrag(alle, 2020, 5)).toEqual({ staerkste: [], schwaechste: [] });
  });
});

describe('fuellstandGegenErtrag', () => {
  it('mittlerer Ertrag je Stufe über alle Jahre', () => {
    const f = fuellstandGegenErtrag(alle, null, 5);
    expect(f.map((s) => `${s.stufe}:${s.anzahl}:${s.mittelKg}`)).toEqual(['1:1:7', '2:1:12', '3:2:19.1', '4:1:30', '5:1:40']);
    expect(f[2]).toMatchObject({ minKg: 18, maxKg: 20.25 });
  });

  it('für ein Jahr; Stufen ohne Bäume bleiben leer', () => {
    const f = fuellstandGegenErtrag(alle, 2026, 5);
    expect(f.map((s) => `${s.stufe}:${s.anzahl}:${s.mittelKg}`)).toEqual(['1:1:7', '2:0:null', '3:1:18', '4:0:null', '5:1:40']);
  });

  it('Stufen über dem aktuellen Maximum werden angehängt', () => {
    expect(fuellstandGegenErtrag(alle, null, 3).map((s) => s.stufe)).toEqual([1, 2, 3, 4, 5]);
  });
});
