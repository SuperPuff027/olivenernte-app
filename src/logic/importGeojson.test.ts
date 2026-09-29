import { describe, expect, it } from 'vitest';
import type { Baum, Grundstueck, Sorte } from '../model/typen';
import { leseGeojson, planeImport, type Bestand, type GelesenerImport } from './importGeojson';
import { RINGFARBEN_VORSCHLAG } from './sorten';

// Echte Daten sind privat und fehlen z. B. in CI; dann wird der Test übersprungen.
const echteDaten = import.meta.glob<string>('../../testdaten/hain.geojson', {
  eager: true,
  query: '?raw',
  import: 'default',
});
const hainGeojson = Object.values(echteDaten)[0];

// Beliebige Testkoordinaten
function baumFeature(nummer: unknown, koordinaten: unknown = [10, 20, 5], weitere: object = {}) {
  return {
    type: 'Feature',
    properties: { typ: 'baum', nummer, ...weitere },
    geometry: { type: 'Point', coordinates: koordinaten },
  };
}

const RING = [
  [10, 20],
  [10.01, 20],
  [10.01, 20.01],
  [10, 20.01],
];

function grundstueckFeature(ring: unknown = RING, name: unknown = 'Test') {
  return { type: 'Feature', properties: { typ: 'grundstueck', name }, geometry: { type: 'Polygon', coordinates: [ring] } };
}

function sammlung(...features: unknown[]) {
  return { type: 'FeatureCollection', features };
}

function lies(json: unknown): GelesenerImport {
  const ergebnis = leseGeojson(json);
  if (!ergebnis.ok) throw new Error(ergebnis.fehler);
  return ergebnis.daten;
}

describe('leseGeojson', () => {
  it.skipIf(!hainGeojson)('liest testdaten/hain.geojson: Grundstück mit 22 Eckpunkten und B-1 bis B-5', () => {
    const daten = lies(JSON.parse(hainGeojson!));
    expect(daten.grundstueck?.name).toBe('Hain');
    expect(daten.grundstueck?.polygon.coordinates[0]).toHaveLength(23); // 22 + Schlusspunkt
    expect(daten.baeume.map((b) => b.nummer)).toEqual(['B-1', 'B-2', 'B-3', 'B-4', 'B-5']);
    expect(daten.baeume.every((b) => b.sorte === null && b.hoehe_m !== null)).toBe(true);
    expect(daten.uebersprungen).toEqual([]);
  });

  it('lehnt Nicht-GeoJSON ab', () => {
    expect(leseGeojson(null)).toEqual({ ok: false, fehler: 'kein_geojson' });
    expect(leseGeojson({ type: 'Point', coordinates: [1, 2] })).toEqual({ ok: false, fehler: 'kein_geojson' });
    expect(leseGeojson([])).toEqual({ ok: false, fehler: 'kein_geojson' });
  });

  it('meldet Dateien ohne Grundstück und Bäume als leer', () => {
    expect(leseGeojson(sammlung())).toEqual({ ok: false, fehler: 'leer' });
    expect(leseGeojson(sammlung({ type: 'Feature', properties: {}, geometry: null }))).toEqual({
      ok: false,
      fehler: 'leer',
    });
  });

  it('übernimmt Höhe aus properties, sonst aus der dritten Koordinate', () => {
    const daten = lies(sammlung(baumFeature('B-1', [10, 20, 5]), baumFeature('B-2', [10, 20, 5], { hoehe_m: 7 }), baumFeature('B-3', [10, 20])));
    expect(daten.baeume.map((b) => b.hoehe_m)).toEqual([5, 7, null]);
  });

  it('übernimmt Sorte, Notiz und Genauigkeit', () => {
    const daten = lies(sammlung(baumFeature('B-1', [10, 20], { sorte: ' Memecik ', notiz: 'alt', gps_genauigkeit_m: 3.5 })));
    expect(daten.baeume[0]).toMatchObject({ sorte: 'Memecik', notiz: 'alt', gps_genauigkeit_m: 3.5, lon: 10, lat: 20 });
  });

  it('erkennt Features ohne typ an der Geometrie', () => {
    const daten = lies(
      sammlung(
        { type: 'Feature', properties: { nummer: 'B-1' }, geometry: { type: 'Point', coordinates: [10, 20] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [RING] } },
      ),
    );
    expect(daten.baeume).toHaveLength(1);
    expect(daten.grundstueck?.name).toBe('Grundstück');
  });

  it('schließt offene Ringe und verwirft zu kleine Polygone', () => {
    expect(lies(sammlung(grundstueckFeature())).grundstueck?.polygon.coordinates[0]).toHaveLength(5);
    const daten = lies(sammlung(grundstueckFeature([[10, 20], [10.01, 20]]), baumFeature('B-1')));
    expect(daten.grundstueck).toBeNull();
    expect(daten.uebersprungen).toEqual([{ nr: 1, nummer: null, grund: 'ungueltige_geometrie' }]);
  });

  it('überspringt fehlerhafte Bäume mit Grund', () => {
    const daten = lies(
      sammlung(
        baumFeature('B-1'),
        baumFeature(''),
        baumFeature('B-1'),
        baumFeature('B-2', [200, 20]),
        baumFeature('B-3', ['10', 20]),
        grundstueckFeature(),
        grundstueckFeature(),
        { type: 'Feature', properties: { typ: 'sensor' }, geometry: { type: 'Point', coordinates: [10, 20] } },
      ),
    );
    expect(daten.baeume.map((b) => b.nummer)).toEqual(['B-1']);
    expect(daten.uebersprungen.map((u) => u.grund)).toEqual([
      'ohne_nummer',
      'nummer_doppelt',
      'ungueltige_geometrie',
      'ungueltige_geometrie',
      'weiteres_grundstueck',
      'unbekannter_typ',
    ]);
  });
});

describe('planeImport', () => {
  const JETZT = new Date('2026-10-05T10:00:00Z');
  const leer: Bestand = { grundstuecke: [], baeume: [], sorten: [] };

  function ids() {
    let n = 0;
    return () => `id-${++n}`;
  }

  const vorhanden = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };

  it('legt Grundstück und Bäume neu an und verknüpft sie', () => {
    const plan = planeImport(lies(sammlung(grundstueckFeature(), baumFeature('B-1'))), leer, JETZT, ids(), 'de');
    expect(plan.grundstueck).toMatchObject({ ersetzt: false, datensatz: { id: 'id-1', name: 'Test' } });
    expect(plan.baeume).toHaveLength(1);
    expect(plan.baeume[0]).toMatchObject({ id: 'id-2', nummer: 'B-1', grundstueck_id: 'id-1', sorte_id: null });
    expect(plan.baeume[0]?.aktualisiert_am).toBe(JETZT.toISOString());
  });

  it('ersetzt die Grenze eines vorhandenen Grundstücks und behält dessen ID', () => {
    const alt: Grundstueck = { id: 'alt', name: 'Alt', polygon: { type: 'Polygon', coordinates: [] }, ...vorhanden };
    const plan = planeImport(lies(sammlung(grundstueckFeature())), { ...leer, grundstuecke: [alt] }, JETZT, ids(), 'de');
    expect(plan.grundstueck).toMatchObject({ ersetzt: true, datensatz: { id: 'alt', name: 'Test' } });
  });

  it('hängt Bäume ohne Grundstück in der Datei an das vorhandene Grundstück', () => {
    const alt: Grundstueck = { id: 'alt', name: 'Alt', polygon: { type: 'Polygon', coordinates: [] }, ...vorhanden };
    const plan = planeImport(lies(sammlung(baumFeature('B-1'))), { ...leer, grundstuecke: [alt] }, JETZT, ids(), 'de');
    expect(plan.grundstueck).toBeNull();
    expect(plan.baeume[0]?.grundstueck_id).toBe('alt');
  });

  it('überspringt Nummern, die es schon gibt', () => {
    const b1 = { id: 'x', nummer: 'B-1' } as Baum;
    const plan = planeImport(lies(sammlung(baumFeature('B-1'), baumFeature('B-2'))), { ...leer, baeume: [b1] }, JETZT, ids(), 'de');
    expect(plan.baeume.map((b) => b.nummer)).toEqual(['B-2']);
    expect(plan.uebersprungen).toEqual([{ nr: 1, nummer: 'B-1', grund: 'nummer_vorhanden' }]);
  });

  it('ordnet Sorten über den Namen zu (türkische Schreibweise) und legt fehlende einmal an', () => {
    const memecik: Sorte = { id: 'm', name: 'MEMECİK', ringfarbe: '#123456', ...vorhanden };
    const plan = planeImport(
      lies(
        sammlung(
          baumFeature('B-1', [10, 20], { sorte: 'memecik' }),
          baumFeature('B-2', [10, 20], { sorte: 'Ayvalık' }),
          baumFeature('B-3', [10, 20], { sorte: 'AYVALIK' }),
        ),
      ),
      { ...leer, sorten: [memecik] },
      JETZT,
      ids(),
      'tr',
    );
    expect(plan.neueSorten).toHaveLength(1);
    const ayvalik = plan.neueSorten[0]!;
    expect(ayvalik).toMatchObject({ name: 'Ayvalık', ringfarbe: RINGFARBEN_VORSCHLAG[0], geloescht: false });
    expect(plan.baeume.map((b) => b.sorte_id)).toEqual(['m', ayvalik.id, ayvalik.id]);
  });
});
