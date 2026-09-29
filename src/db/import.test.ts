import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { leseGeojson, planeImport } from '../logic/importGeojson';
import { db } from './datenbank';
import { fuehreImportAus, ladeBestand } from './import';

// Beliebige Testkoordinaten
const DATEI = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { typ: 'grundstueck', name: 'Test' },
      geometry: { type: 'Polygon', coordinates: [[[10, 20], [10.01, 20], [10.01, 20.01], [10, 20]]] },
    },
    {
      type: 'Feature',
      properties: { typ: 'baum', nummer: 'B-1', sorte: 'Memecik' },
      geometry: { type: 'Point', coordinates: [10.005, 20.002] },
    },
  ],
};

async function importiere() {
  const gelesen = leseGeojson(DATEI);
  if (!gelesen.ok) throw new Error(gelesen.fehler);
  const plan = planeImport(gelesen.daten, await ladeBestand(), new Date(), () => crypto.randomUUID(), 'de');
  await fuehreImportAus(plan);
  return plan;
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('fuehreImportAus', () => {
  it('speichert Grundstück, Sorte und Baum', async () => {
    await importiere();
    const bestand = await ladeBestand();
    expect(bestand.grundstuecke.map((g) => g.name)).toEqual(['Test']);
    expect(bestand.sorten.map((s) => s.name)).toEqual(['Memecik']);
    expect(bestand.baeume).toHaveLength(1);
    expect(bestand.baeume[0]).toMatchObject({
      nummer: 'B-1',
      grundstueck_id: bestand.grundstuecke[0]?.id,
      sorte_id: bestand.sorten[0]?.id,
    });
  });

  it('erzeugt beim zweiten Import derselben Datei keine Duplikate', async () => {
    await importiere();
    const zweiter = await importiere();
    expect(zweiter.grundstueck?.ersetzt).toBe(true);
    expect(zweiter.uebersprungen.map((u) => u.grund)).toEqual(['nummer_vorhanden']);
    const bestand = await ladeBestand();
    expect(bestand.grundstuecke).toHaveLength(1);
    expect(bestand.sorten).toHaveLength(1);
    expect(bestand.baeume).toHaveLength(1);
  });
});
