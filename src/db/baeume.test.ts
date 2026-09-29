import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { alsPolygon } from '../logic/polygon';
import { legeBaumAn, loescheBaum } from './baeume';
import { db } from './datenbank';
import { speichereGrundstueck } from './grundstueck';
import { ladeAktive } from './repo';

// Beliebige Testkoordinaten
const QUADRAT = alsPolygon([
  [10, 20],
  [10.01, 20],
  [10.01, 20.01],
  [10, 20.01],
]);

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('legeBaumAn', () => {
  it('nummeriert fortlaufend, auch bei gleichzeitigen Aufrufen', async () => {
    const neu = await Promise.all([legeBaumAn([10.001, 20.001]), legeBaumAn([10.002, 20.002]), legeBaumAn([10.003, 20.003])]);
    expect(neu.map((n) => n.baum.nummer).sort()).toEqual(['B-1', 'B-2', 'B-3']);
    expect(await ladeAktive(db.baeume)).toHaveLength(3);
  });

  it('ordnet dem Grundstück zu und meldet Punkte außerhalb', async () => {
    const g = await speichereGrundstueck(QUADRAT, null, 'Test');
    const innen = await legeBaumAn([10.005, 20.005], 4);
    const aussen = await legeBaumAn([10.02, 20.005]);
    expect(innen).toMatchObject({ ausserhalb: false, baum: { grundstueck_id: g.id, gps_genauigkeit_m: 4 } });
    expect(aussen).toMatchObject({ ausserhalb: true, baum: { grundstueck_id: g.id } });
  });

  it('gelöschter Baum mit höchster Nummer: Nummer wird wieder frei', async () => {
    await legeBaumAn([10.001, 20.001]);
    const zweiter = await legeBaumAn([10.002, 20.002]);
    await loescheBaum(zweiter.baum.id);
    expect((await legeBaumAn([10.003, 20.003])).baum.nummer).toBe('B-2');
    expect((await db.baeume.get(zweiter.baum.id))?.geloescht).toBe(true);
  });
});
