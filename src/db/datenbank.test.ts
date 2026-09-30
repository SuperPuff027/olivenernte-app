import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { OlivenDatenbank } from './datenbank';

// Schema der ersten Version, wie es auf den Geräten aus Phase 1/2 liegt.
const SCHEMA_V1 = {
  grundstuecke: 'id',
  sorten: 'id',
  baeume: 'id, grundstueck_id, sorte_id, nummer',
  saison_status: '[baum_id+jahr], baum_id, jahr',
  einstellungen: 'id',
  sensoren: 'id',
};

async function legeV1An(name: string, daten: (db: Dexie) => Promise<unknown>) {
  const alt = new Dexie(name);
  alt.version(1).stores(SCHEMA_V1);
  await alt.open();
  await daten(alt);
  alt.close();
}

describe('Migration v1 → v2', () => {
  it('übernimmt fuellstand_max in die Hain-Einstellungen und behält die übrigen Daten', async () => {
    await legeV1An('migration-a', async (alt) => {
      await alt.table('einstellungen').put({
        id: 'einstellungen',
        fuellstand_max: 7,
        ziel_gps_genauigkeit_m: 3,
        sprache: 'tr',
        aktualisiert_am: '2026-05-01T00:00:00.000Z',
        geloescht: false,
      });
      await alt.table('sorten').put({ id: 's', name: 'Memecik', ringfarbe: '#1e88e5', aktualisiert_am: 'x', geloescht: false });
    });

    const db = new OlivenDatenbank('migration-a');
    const hain = await db.hain.get('hain');
    expect(hain).toMatchObject({ id: 'hain', fuellstand_max: 7, aktuelle_saison: new Date().getFullYear(), geloescht: false });
    const einstellungen = await db.einstellungen.get('einstellungen');
    expect(einstellungen).toMatchObject({ ziel_gps_genauigkeit_m: 3, sprache: 'tr' });
    expect(einstellungen && 'fuellstand_max' in einstellungen).toBe(false);
    expect(await db.sorten.count()).toBe(1);
    db.close();
  });

  it('ohne alte Einstellungen: Standardwerte', async () => {
    await legeV1An('migration-b', async () => undefined);
    const db = new OlivenDatenbank('migration-b');
    expect(await db.hain.get('hain')).toMatchObject({ fuellstand_max: 5, aktuelle_saison: new Date().getFullYear() });
    db.close();
  });

  it('neue Installation: Tabelle vorhanden, noch leer (Standard kommt aus ladeHain)', async () => {
    const db = new OlivenDatenbank('neu-installiert');
    expect(await db.hain.count()).toBe(0);
    db.close();
  });
});
