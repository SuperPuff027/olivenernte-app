import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Baum } from '../model/typen';
import { db } from './datenbank';
import { aendereSorte, ladeSorten, legeSorteAn, loescheSorte } from './sorten';

const ALT = '2000-01-01T00:00:00.000Z';

// Beliebige Testposition
function baum(id: string, sorte_id: string | null, geloescht = false): Baum {
  return {
    id,
    nummer: id,
    grundstueck_id: null,
    sorte_id,
    lat: 20,
    lon: 10,
    gps_genauigkeit_m: null,
    hoehe_m: null,
    notiz: '',
    aktualisiert_am: ALT,
    geloescht,
  };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('Sorten', () => {
  it('legt an, benennt um und ändert die Farbe', async () => {
    const s = await legeSorteAn('  Memecik ', '#1e88e5');
    expect(s.name).toBe('Memecik');
    await aendereSorte(s.id, { name: 'Memecik (alt)' });
    await aendereSorte(s.id, { ringfarbe: '#ff6d00' });
    expect(await ladeSorten()).toMatchObject([{ id: s.id, name: 'Memecik (alt)', ringfarbe: '#ff6d00' }]);
  });

  it('ändert gelöschte Sorten nicht', async () => {
    const s = await legeSorteAn('A', '#000000');
    await loescheSorte(s.id, null);
    expect(await aendereSorte(s.id, { name: 'B' })).toBeNull();
  });

  it('hängt beim Löschen die Bäume auf eine andere Sorte um', async () => {
    const alt = await legeSorteAn('Alt', '#000000');
    const neu = await legeSorteAn('Neu', '#ffffff');
    await db.baeume.bulkPut([baum('a', alt.id), baum('b', alt.id), baum('c', neu.id), baum('d', alt.id, true)]);

    await loescheSorte(alt.id, neu.id);

    expect((await ladeSorten()).map((s) => s.name)).toEqual(['Neu']);
    expect((await db.sorten.get(alt.id))?.geloescht).toBe(true);
    expect((await db.baeume.get('a'))?.sorte_id).toBe(neu.id);
    expect((await db.baeume.get('a'))?.aktualisiert_am).not.toBe(ALT);
    expect((await db.baeume.get('c'))?.aktualisiert_am).toBe(ALT);
    // gelöschte Bäume bleiben unverändert
    expect((await db.baeume.get('d'))?.sorte_id).toBe(alt.id);
  });

  it('setzt Bäume beim Löschen auf „ohne Sorte“', async () => {
    const alt = await legeSorteAn('Alt', '#000000');
    await db.baeume.put(baum('a', alt.id));
    await loescheSorte(alt.id, null);
    expect((await db.baeume.get('a'))?.sorte_id).toBeNull();
  });
});
