import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { alsPolygon } from '../logic/polygon';
import type { Baum } from '../model/typen';
import { db } from './datenbank';
import { ladeGrundstueck, speichereGrundstueck } from './grundstueck';

// Beliebige Testkoordinaten
const POLYGON = alsPolygon([
  [10, 20],
  [10.01, 20],
  [10.01, 20.01],
]);
const ALT = '2000-01-01T00:00:00.000Z';

function baum(id: string, grundstueck_id: string | null): Baum {
  return {
    id,
    nummer: id,
    grundstueck_id,
    sorte_id: null,
    lat: 20.005,
    lon: 10.005,
    gps_genauigkeit_m: null,
    hoehe_m: null,
    notiz: '',
    aktualisiert_am: ALT,
    geloescht: false,
  };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('speichereGrundstueck', () => {
  it('legt ein neues Grundstück an und ordnet Bäume ohne Grundstück zu', async () => {
    await db.baeume.bulkPut([baum('frei', null), baum('fremd', 'anderes')]);
    const g = await speichereGrundstueck(POLYGON, null, 'Grundstück');

    expect(await ladeGrundstueck()).toMatchObject({ id: g.id, name: 'Grundstück' });
    expect((await db.baeume.get('frei'))?.grundstueck_id).toBe(g.id);
    expect((await db.baeume.get('frei'))?.aktualisiert_am).not.toBe(ALT);
    expect((await db.baeume.get('fremd'))?.grundstueck_id).toBe('anderes');
  });

  it('ändert beim vorhandenen Grundstück nur die Grenze', async () => {
    const g = await speichereGrundstueck(POLYGON, null, 'Hain');
    const neuesPolygon = alsPolygon([
      [10, 20],
      [10.02, 20],
      [10.02, 20.02],
    ]);
    const geaendert = await speichereGrundstueck(neuesPolygon, g, 'ignoriert');

    expect(geaendert).toMatchObject({ id: g.id, name: 'Hain', polygon: neuesPolygon });
    expect(await db.grundstuecke.count()).toBe(1);
  });

  it('liefert null ohne aktives Grundstück', async () => {
    expect(await ladeGrundstueck()).toBeNull();
  });
});
