import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Baum } from '../model/typen';
import { db } from './datenbank';
import {
  aendereEinstellungen,
  aendereSaisonStatus,
  ladeAktive,
  ladeEinstellungen,
  ladeSaisonStatus,
  ladeSaisonStatusJahr,
  loescheWeich,
  speichere,
} from './repo';

const ALT = '2000-01-01T00:00:00.000Z';

// Beliebige Testposition
function baum(id: string, nummer: string): Baum {
  return {
    id,
    nummer,
    grundstueck_id: null,
    sorte_id: null,
    lat: 12.3456789,
    lon: 45.6789,
    gps_genauigkeit_m: null,
    hoehe_m: 100,
    notiz: '',
    aktualisiert_am: ALT,
    geloescht: false,
  };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('speichere / ladeAktive / loescheWeich', () => {
  it('setzt beim Speichern aktualisiert_am', async () => {
    const gespeichert = await speichere(db.baeume, baum('a', 'B-1'));
    expect(gespeichert.aktualisiert_am).not.toBe(ALT);
    expect((await db.baeume.get('a'))?.aktualisiert_am).toBe(gespeichert.aktualisiert_am);
  });

  it('löscht weich: Datensatz bleibt, ist aber nicht mehr aktiv', async () => {
    await speichere(db.baeume, baum('a', 'B-1'));
    await speichere(db.baeume, baum('b', 'B-2'));
    await loescheWeich(db.baeume, 'a');

    expect((await ladeAktive(db.baeume)).map((b) => b.id)).toEqual(['b']);
    const geloescht = await db.baeume.get('a');
    expect(geloescht?.geloescht).toBe(true);
    expect(geloescht?.aktualisiert_am).not.toBe(ALT);
  });

  it('ignoriert unbekannte IDs beim Löschen', async () => {
    await loescheWeich(db.baeume, 'gibt-es-nicht');
    expect(await db.baeume.count()).toBe(0);
  });
});

describe('Einstellungen', () => {
  it('liefert Standardwerte, solange nichts gespeichert ist', async () => {
    const e = await ladeEinstellungen();
    expect(e.fuellstand_max).toBe(5);
    expect(e.ziel_gps_genauigkeit_m).toBe(5);
    expect(e.sprache).toBeNull();
  });

  it('speichert Änderungen und behält die übrigen Werte', async () => {
    await aendereEinstellungen({ sprache: 'tr' });
    await aendereEinstellungen({ ziel_gps_genauigkeit_m: 3 });
    const e = await ladeEinstellungen();
    expect(e.sprache).toBe('tr');
    expect(e.ziel_gps_genauigkeit_m).toBe(3);
    expect(e.fuellstand_max).toBe(5);
  });
});

describe('Saisonstatus', () => {
  it('legt den Status beim ersten Ändern an', async () => {
    expect(await ladeSaisonStatus('a', 2026)).toBeNull();
    await aendereSaisonStatus('a', 2026, { fuellstand: 4 });
    const s = await ladeSaisonStatus('a', 2026);
    expect(s).toMatchObject({ baum_id: 'a', jahr: 2026, status: 'nicht_bereit', fuellstand: 4 });
  });

  it('ändert nur die angegebenen Felder und trennt die Jahre', async () => {
    await aendereSaisonStatus('a', 2026, { fuellstand: 4 });
    await aendereSaisonStatus('a', 2026, { status: 'bereit' });
    await aendereSaisonStatus('a', 2025, { status: 'geerntet' });

    expect(await ladeSaisonStatus('a', 2026)).toMatchObject({ status: 'bereit', fuellstand: 4 });
    expect(await ladeSaisonStatus('a', 2025)).toMatchObject({ status: 'geerntet', fuellstand: null });
  });

  it('lädt alle aktiven Status eines Jahres', async () => {
    await aendereSaisonStatus('a', 2026, { status: 'bereit' });
    await aendereSaisonStatus('b', 2026, { status: 'geerntet' });
    await aendereSaisonStatus('a', 2025, { status: 'geerntet' });
    await db.saison_status.update(['b', 2026], { geloescht: true });
    expect((await ladeSaisonStatusJahr(2026)).map((s) => s.baum_id)).toEqual(['a']);
  });
});
