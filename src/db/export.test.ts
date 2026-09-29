import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { erstelleExport } from '../logic/exportGeojson';
import { leseGeojson, planeImport } from '../logic/importGeojson';
import { alsPolygon } from '../logic/polygon';
import { aendereBaum, legeBaumAn } from './baeume';
import { db } from './datenbank';
import { ladeExportDaten } from './export';
import { speichereGrundstueck } from './grundstueck';
import { fuehreImportAus, ladeBestand } from './import';
import { aendereSaisonStatus } from './repo';
import { legeSorteAn } from './sorten';

// Beliebige Testkoordinaten
const QUADRAT = alsPolygon([
  [10, 20],
  [10.01, 20],
  [10.01, 20.01],
  [10, 20.01],
]);

async function tabellen() {
  const sortiert = <T>(liste: T[]) => [...liste].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    grundstuecke: sortiert(await db.grundstuecke.toArray()),
    baeume: sortiert(await db.baeume.toArray()),
    sorten: sortiert(await db.sorten.toArray()),
    saison: sortiert(await db.saison_status.toArray()),
  };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('Export aus der Datenbank und Wiederherstellung', () => {
  it('stellt nach dem Leeren der Datenbank alles wieder her', async () => {
    await speichereGrundstueck(QUADRAT, null, 'Test');
    const memecik = await legeSorteAn('Memecik', '#1e88e5');
    await legeSorteAn('Gemlik', '#795548');
    const { baum: b1 } = await legeBaumAn([10.002, 20.003], 2.5);
    const { baum: b2 } = await legeBaumAn([10.004, 20.005]);
    await aendereBaum(b1.id, { sorte_id: memecik.id, notiz: 'Schnitt' }, 'de');
    await aendereSaisonStatus(b1.id, 2025, { status: 'geerntet', fuellstand: 4, ertrag_kg: 40 });
    await aendereSaisonStatus(b1.id, 2026, { status: 'bereit', fuellstand: 3 });
    await aendereSaisonStatus(b2.id, 2026, { fuellstand: 2 });
    const vorher = await tabellen();

    const text = JSON.stringify(erstelleExport(await ladeExportDaten(), new Date(), 2026));
    await Promise.all(db.tables.map((t) => t.clear()));

    const gelesen = leseGeojson(JSON.parse(text));
    if (!gelesen.ok) throw new Error(gelesen.fehler);
    await fuehreImportAus(planeImport(gelesen.daten, await ladeBestand(), new Date(), () => crypto.randomUUID(), 'de'));

    expect(await tabellen()).toEqual(vorher);
  });
});
