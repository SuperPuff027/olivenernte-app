import { describe, expect, it } from 'vitest';
import type { Baum, Grundstueck, SaisonStatus, Sorte } from '../model/typen';
import { erstelleExport, exportDateiname, type ExportDaten } from './exportGeojson';
import { leseGeojson, planeImport } from './importGeojson';

// Beliebige Testkoordinaten
const ZEIT = '2026-09-01T08:30:00.000Z';
const basis = { aktualisiert_am: ZEIT, geloescht: false };

const grundstueck: Grundstueck = {
  id: 'g-1',
  name: 'Testhain',
  polygon: {
    type: 'Polygon',
    coordinates: [
      [
        [10, 20, 50],
        [10.01, 20, 51],
        [10.01, 20.01, 52],
        [10, 20.01, 53],
        [10, 20, 50],
      ],
    ],
  },
  ...basis,
};

const sorten: Sorte[] = [
  { id: 's-m', name: 'Memecik', ringfarbe: '#1e88e5', ...basis },
  { id: 's-a', name: 'Ayvalık', ringfarbe: '#ff00ff', ...basis, aktualisiert_am: '2026-08-01T00:00:00.000Z' },
  // Sorte ohne Bäume: muss trotzdem mit
  { id: 's-g', name: 'Gemlik', ringfarbe: '#795548', ...basis },
  { id: 's-weg', name: 'Alt', ringfarbe: '#000000', ...basis, geloescht: true },
];

function baum(id: string, nummer: string, sorte_id: string | null, weitere: Partial<Baum> = {}): Baum {
  return {
    id,
    nummer,
    grundstueck_id: 'g-1',
    sorte_id,
    lat: 20.005,
    lon: 10.005,
    gps_genauigkeit_m: null,
    hoehe_m: null,
    notiz: '',
    ...basis,
    ...weitere,
  };
}

const baeume: Baum[] = [
  baum('b-1', 'B-1', 's-m', { gps_genauigkeit_m: 2.4, hoehe_m: 55.5, notiz: 'Schnitt nötig', lat: 20.001, lon: 10.002 }),
  baum('b-2', 'B-2', 's-a', { aktualisiert_am: '2026-09-02T10:00:00.000Z' }),
  baum('b-3', 'Nordecke', null, { notiz: 'Zeile 1\nZeile 2 „mit“ Sonderzeichen: ı İ ş' }),
  baum('b-4', 'B-4', 's-m', { geloescht: true }),
];

function status(baum_id: string, jahr: number, weitere: Partial<SaisonStatus> = {}): SaisonStatus {
  return { baum_id, jahr, status: 'nicht_bereit', fuellstand: null, ertrag_kg: null, erntedatum: null, ...basis, ...weitere };
}

const saisonStatus: SaisonStatus[] = [
  status('b-1', 2025, { status: 'geerntet', fuellstand: 4, ertrag_kg: 38.5, erntedatum: '2025-11-02' }),
  status('b-1', 2026, { status: 'bereit', fuellstand: 3 }),
  status('b-2', 2026, { status: 'nicht_bereit', fuellstand: 5 }),
  status('b-3', 2026, { geloescht: true }),
  status('b-4', 2026, { status: 'bereit' }),
];

const DATEN: ExportDaten = { grundstuecke: [grundstueck], baeume, sorten, saisonStatus };
const JETZT = new Date('2026-09-29T12:00:00Z');

/** Export → Text → Import in einen leeren Bestand */
function rundreise(daten: ExportDaten) {
  const text = JSON.stringify(erstelleExport(daten, JETZT, 2026));
  const gelesen = leseGeojson(JSON.parse(text));
  if (!gelesen.ok) throw new Error(gelesen.fehler);
  let n = 0;
  return planeImport(gelesen.daten, { grundstuecke: [], baeume: [], sorten: [] }, JETZT, () => `neu-${++n}`, 'de');
}

const nachId = <T extends { id: string }>(liste: readonly T[]) => [...liste].sort((a, b) => a.id.localeCompare(b.id));
const nachSchluessel = (liste: readonly SaisonStatus[]) =>
  [...liste].sort((a, b) => a.baum_id.localeCompare(b.baum_id) || a.jahr - b.jahr);

describe('Export und Import (Rundreise)', () => {
  it('ergibt dieselben aktiven Daten mit IDs und Zeitstempeln', () => {
    const plan = rundreise(DATEN);
    expect(plan.uebersprungen).toEqual([]);
    expect(plan.grundstueck).toEqual({ ersetzt: false, datensatz: grundstueck });
    expect(nachId(plan.baeume)).toEqual(nachId(baeume.filter((b) => !b.geloescht)));
    expect(nachId(plan.neueSorten)).toEqual(nachId(sorten.filter((s) => !s.geloescht)));
    expect(nachSchluessel(plan.saisonStatus)).toEqual(
      nachSchluessel(saisonStatus.filter((s) => !s.geloescht && s.baum_id !== 'b-4')),
    );
  });

  it('ein Baum mit gelöschter Sorte kommt als „ohne Sorte“ zurück (wie auf der Karte)', () => {
    const plan = rundreise({ ...DATEN, baeume: [baum('b-9', 'B-9', 's-weg')] });
    expect(plan.baeume[0]?.sorte_id).toBeNull();
  });

  it('ein zweiter Import derselben Datei legt nichts doppelt an', () => {
    const text = JSON.stringify(erstelleExport(DATEN, JETZT, 2026));
    const gelesen = leseGeojson(JSON.parse(text));
    if (!gelesen.ok) throw new Error(gelesen.fehler);
    const erster = rundreise(DATEN);
    const bestand = { grundstuecke: [erster.grundstueck!.datensatz], baeume: erster.baeume, sorten: erster.neueSorten };
    const zweiter = planeImport(gelesen.daten, bestand, JETZT, () => 'neu', 'de');
    expect(zweiter.baeume).toEqual([]);
    expect(zweiter.neueSorten).toEqual([]);
    expect(zweiter.saisonStatus).toEqual([]);
    expect(zweiter.uebersprungen.map((u) => u.grund)).toEqual(['nummer_vorhanden', 'nummer_vorhanden', 'nummer_vorhanden']);
  });
});

describe('erstelleExport', () => {
  const geojson = erstelleExport(DATEN, JETZT, 2026);
  const baumFeature = (nummer: string) => geojson.features.find((f) => 'nummer' in f.properties && f.properties.nummer === nummer);

  it('ist eine FeatureCollection mit Grundstück und aktiven Bäumen', () => {
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.map((f) => f.properties.typ)).toEqual(['grundstueck', 'baum', 'baum', 'baum']);
    expect(baumFeature('B-4')).toBeUndefined();
  });

  it('Punkte mit Höhe als dritte Koordinate, Status der aktuellen Saison flach für GIS', () => {
    expect(baumFeature('B-1')?.geometry).toEqual({ type: 'Point', coordinates: [10.002, 20.001, 55.5] });
    expect(baumFeature('B-2')?.geometry.coordinates).toEqual([10.005, 20.005]);
    expect(baumFeature('B-1')?.properties).toMatchObject({ sorte: 'Memecik', ringfarbe: '#1e88e5', status: 'bereit', fuellstand: 3 });
    expect(baumFeature('Nordecke')?.properties).toMatchObject({ sorte: null, status: null, saison: [] });
  });

  it('Saisonstatus nach Jahr sortiert', () => {
    expect(baumFeature('B-1')?.properties).toMatchObject({ saison: [{ jahr: 2025 }, { jahr: 2026 }] });
  });

  it('App-Daten mit Format, Zeitpunkt und aktiven Sorten', () => {
    expect(geojson.hrvst).toMatchObject({ format: 1, exportiert_am: JETZT.toISOString() });
    expect(geojson.hrvst.sorten.map((s) => s.name)).toEqual(['Memecik', 'Ayvalık', 'Gemlik']);
  });
});

describe('exportDateiname', () => {
  it('enthält das lokale Datum', () => {
    expect(exportDateiname(new Date(2026, 8, 5, 23, 59))).toBe('hrvst-2026-09-05.geojson');
  });
});
