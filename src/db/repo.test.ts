import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Baum } from '../model/typen';
import { db } from './datenbank';
import {
  aendereEinstellungen,
  aendereHain,
  aendereSaisonStatus,
  ladeAktive,
  ladeEinstellungen,
  ladeHain,
  ladeSaisonStatus,
  ladeSaisonJahre,
  ladeSaisonStatusJahr,
  loescheWeich,
  markiereGeerntet,
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
    expect(e.ziel_gps_genauigkeit_m).toBe(5);
    expect(e.sprache).toBeNull();
  });

  it('speichert Änderungen und behält die übrigen Werte', async () => {
    await aendereEinstellungen({ sprache: 'tr' });
    await aendereEinstellungen({ ziel_gps_genauigkeit_m: 3 });
    const e = await ladeEinstellungen();
    expect(e.sprache).toBe('tr');
    expect(e.ziel_gps_genauigkeit_m).toBe(3);
  });
});

describe('Hain-Einstellungen', () => {
  it('Standard: aktuelle Saison = laufendes Jahr, Füllstand max 5', async () => {
    expect(await ladeHain()).toMatchObject({ id: 'hain', aktuelle_saison: new Date().getFullYear(), fuellstand_max: 5 });
  });

  it('speichert Änderungen mit aktualisiert_am und behält die übrigen Werte', async () => {
    await aendereHain({ fuellstand_max: 7 });
    const h = await aendereHain({ aktuelle_saison: 2027 });
    expect(h).toMatchObject({ aktuelle_saison: 2027, fuellstand_max: 7, geloescht: false });
    expect(await ladeHain()).toEqual(h);
    expect(Date.parse(h.aktualisiert_am)).toBeGreaterThan(Date.now() - 60_000);
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

describe('markiereGeerntet', () => {
  it('setzt Status, Ertrag und Datum; erneutes Markieren ändert nur den Ertrag', async () => {
    await aendereSaisonStatus('b-1', 2026, { status: 'bereit', fuellstand: 4 });
    const erst = await markiereGeerntet('b-1', 2026, 31.5);
    expect(erst).toMatchObject({ status: 'geerntet', ertrag_kg: 31.5, fuellstand: 4 });
    expect(erst.erntedatum).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await db.saison_status.put({ ...erst, erntedatum: '2026-10-01' });
    const korrigiert = await markiereGeerntet('b-1', 2026, 33);
    expect(korrigiert).toMatchObject({ status: 'geerntet', ertrag_kg: 33, erntedatum: '2026-10-01' });
  });

  it('ohne Menge und ohne vorherigen Status', async () => {
    expect(await markiereGeerntet('b-2', 2026, null)).toMatchObject({ status: 'geerntet', ertrag_kg: null, fuellstand: null });
  });

  it('Zurücksetzen des Status behält Ertrag und Datum', async () => {
    const geerntet = await markiereGeerntet('b-3', 2026, 12);
    const zurueck = await aendereSaisonStatus('b-3', 2026, { status: 'bereit' });
    expect(zurueck).toMatchObject({ status: 'bereit', ertrag_kg: 12, erntedatum: geerntet.erntedatum });
  });
});

describe('ladeSaisonJahre', () => {
  it('Jahre mit aktiven Einträgen', async () => {
    await aendereSaisonStatus('b-1', 2024, { status: 'geerntet' });
    await aendereSaisonStatus('b-2', 2026, { status: 'bereit' });
    await aendereSaisonStatus('b-1', 2026, { status: 'bereit' });
    const geloescht = await aendereSaisonStatus('b-3', 2023, { status: 'bereit' });
    await db.saison_status.put({ ...geloescht, geloescht: true });
    expect((await ladeSaisonJahre()).sort()).toEqual([2024, 2026]);
  });
});
