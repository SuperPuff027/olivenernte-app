import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { alsPolygon } from '../logic/polygon';
import { aendereBaum, ladeBaum, legeBaumAn, loescheBaum } from './baeume';
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

describe('aendereBaum', () => {
  it('ändert Sorte und Notiz und setzt aktualisiert_am', async () => {
    const { baum } = await legeBaumAn([10.001, 20.001]);
    await db.baeume.put({ ...baum, aktualisiert_am: '2000-01-01T00:00:00.000Z' });
    const ergebnis = await aendereBaum(baum.id, { sorte_id: 's1', notiz: 'Schnitt nötig' }, 'de');
    expect(ergebnis).toMatchObject({ ok: true, baum: { sorte_id: 's1', notiz: 'Schnitt nötig', nummer: 'B-1' } });
    const gespeichert = await ladeBaum(baum.id);
    expect(gespeichert?.notiz).toBe('Schnitt nötig');
    expect(gespeichert?.aktualisiert_am).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('vereinheitlicht die Nummer und lehnt vergebene ab, ohne zu speichern', async () => {
    const eins = await legeBaumAn([10.001, 20.001]);
    const zwei = await legeBaumAn([10.002, 20.002]);
    expect(await aendereBaum(zwei.baum.id, { nummer: ' b_1 ', notiz: 'x' }, 'de')).toEqual({ ok: false, fehler: 'doppelt' });
    expect(await aendereBaum(zwei.baum.id, { nummer: '  ' }, 'de')).toEqual({ ok: false, fehler: 'leer' });
    expect((await ladeBaum(zwei.baum.id))?.notiz).toBe('');
    expect(await aendereBaum(zwei.baum.id, { nummer: 'b20' }, 'de')).toMatchObject({ ok: true, baum: { nummer: 'B-20' } });
    // Die eigene Nummer in anderer Schreibweise ist erlaubt.
    expect(await aendereBaum(eins.baum.id, { nummer: 'B_1' }, 'de')).toMatchObject({ ok: true, baum: { nummer: 'B-1' } });
  });

  it('ändert gelöschte Bäume nicht', async () => {
    const { baum } = await legeBaumAn([10.001, 20.001]);
    await loescheBaum(baum.id);
    expect(await aendereBaum(baum.id, { notiz: 'x' }, 'de')).toEqual({ ok: false, fehler: 'nicht_gefunden' });
    expect(await ladeBaum(baum.id)).toBeNull();
  });
});
