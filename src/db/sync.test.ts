import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { speicherImArbeitsspeicher, verarbeiteAnfrage, type ServerSpeicher, type SyncAnfrage } from '../logic/sync';
import type { Baum, SaisonStatus } from '../model/typen';
import { OlivenDatenbank } from './datenbank';
import { ladeSyncMeta, offeneAnzahl, synchronisiere, type SyncTransport } from './sync';

// Zwei Handys (eigene Datenbanken) und ein simulierter Server; Übertragung als JSON wie im Netz.
let zaehler = 0;
const offen: OlivenDatenbank[] = [];

function geraet(): OlivenDatenbank {
  const d = new OlivenDatenbank(`sync-test-${++zaehler}`);
  offen.push(d);
  return d;
}

function netz(server: ServerSpeicher): SyncTransport {
  return async (anfrage: SyncAnfrage) =>
    JSON.parse(JSON.stringify(await verarbeiteAnfrage(server, JSON.parse(JSON.stringify(anfrage)) as SyncAnfrage)));
}

afterEach(() => {
  for (const d of offen.splice(0)) d.close();
});

// Beliebige Testkoordinaten
const baum = (id: string, zeit: string, weitere: Partial<Baum> = {}): Baum => ({
  id,
  nummer: id,
  grundstueck_id: null,
  sorte_id: null,
  lat: 20,
  lon: 10,
  gps_genauigkeit_m: null,
  hoehe_m: null,
  notiz: '',
  aktualisiert_am: zeit,
  geloescht: false,
  ...weitere,
});

const T1 = '2026-10-01T10:00:00.000Z';
const T2 = '2026-10-01T11:00:00.000Z';
const T3 = '2026-10-01T12:00:00.000Z';

describe('Abgleich zwischen zwei Geräten', () => {
  it('überträgt Bäume, Sorten, Saisonstatus und Hain-Einstellungen, danach nichts mehr offen', async () => {
    const server = speicherImArbeitsspeicher();
    const a = geraet();
    const b = geraet();
    await a.baeume.put(baum('b-1', T1, { sorte_id: 's-1' }));
    await a.sorten.put({ id: 's-1', name: 'Memecik', ringfarbe: '#1e88e5', aktualisiert_am: T1, geloescht: false });
    const status: SaisonStatus = { baum_id: 'b-1', jahr: 2026, status: 'geerntet', fuellstand: 4, ertrag_kg: 30, erntedatum: '2026-10-01', aktualisiert_am: T1, geloescht: false };
    await a.saison_status.put(status);
    await a.hain.put({ id: 'hain', aktuelle_saison: 2026, fuellstand_max: 7, aktualisiert_am: T1, geloescht: false });

    expect(await offeneAnzahl(a)).toBe(4);
    expect(await synchronisiere(netz(server), a)).toMatchObject({ gesendet: 4, rev: 4 });
    expect(await offeneAnzahl(a)).toBe(0);

    expect(await synchronisiere(netz(server), b)).toMatchObject({ gesendet: 0, empfangen: 4, rev: 4 });
    expect(await b.baeume.get('b-1')).toEqual(baum('b-1', T1, { sorte_id: 's-1' }));
    expect(await b.saison_status.get(['b-1', 2026])).toEqual(status);
    expect((await b.hain.get('hain'))?.fuellstand_max).toBe(7);
    expect(await offeneAnzahl(b)).toBe(0);
    expect((await ladeSyncMeta(b)).letzter_abgleich).not.toBeNull();
  });

  it('beide ändern offline denselben Baum: der neuere Zeitstempel gewinnt auf beiden Geräten', async () => {
    const server = speicherImArbeitsspeicher();
    const a = geraet();
    const b = geraet();
    await a.baeume.put(baum('b-1', T1));
    await synchronisiere(netz(server), a);
    await synchronisiere(netz(server), b);

    await a.baeume.put(baum('b-1', T3, { notiz: 'von A (neuer)' }));
    await b.baeume.put(baum('b-1', T2, { notiz: 'von B (älter)' }));
    // B gleicht zuerst ab, dann A, dann wieder B
    await synchronisiere(netz(server), b);
    await synchronisiere(netz(server), a);
    await synchronisiere(netz(server), b);

    expect((await a.baeume.get('b-1'))?.notiz).toBe('von A (neuer)');
    expect((await b.baeume.get('b-1'))?.notiz).toBe('von A (neuer)');
    expect(await offeneAnzahl(a)).toBe(0);
    expect(await offeneAnzahl(b)).toBe(0);
  });

  it('eine ältere Änderung wird vom Server abgelehnt und durch die neuere ersetzt', async () => {
    const server = speicherImArbeitsspeicher();
    const a = geraet();
    const b = geraet();
    await a.baeume.put(baum('b-1', T3, { notiz: 'neu' }));
    await synchronisiere(netz(server), a);
    // B hat denselben Baum mit älterem Stand (z. B. aus einer alten Sicherung importiert)
    await b.baeume.put(baum('b-1', T1, { notiz: 'alt' }));
    expect(await synchronisiere(netz(server), b)).toMatchObject({ gesendet: 1, empfangen: 1 });
    expect((await b.baeume.get('b-1'))?.notiz).toBe('neu');
    expect(await offeneAnzahl(b)).toBe(0);
  });

  it('Löschen (weich) wird übertragen', async () => {
    const server = speicherImArbeitsspeicher();
    const a = geraet();
    const b = geraet();
    await a.baeume.put(baum('b-1', T1));
    await synchronisiere(netz(server), a);
    await synchronisiere(netz(server), b);
    await b.baeume.put(baum('b-1', T2, { geloescht: true }));
    await synchronisiere(netz(server), b);
    await synchronisiere(netz(server), a);
    expect((await a.baeume.get('b-1'))?.geloescht).toBe(true);
  });

  it('eine Änderung während der Übertragung geht nicht verloren', async () => {
    const server = speicherImArbeitsspeicher();
    const a = geraet();
    await a.baeume.put(baum('b-1', T1, { notiz: 'vorher' }));
    const langsam: SyncTransport = async (anfrage) => {
      // Während die Anfrage unterwegs ist, ändert jemand den Baum auf dem Gerät.
      await a.baeume.put(baum('b-1', T2, { notiz: 'während' }));
      return netz(server)(anfrage);
    };
    await synchronisiere(langsam, a);
    expect((await a.baeume.get('b-1'))?.notiz).toBe('während');
    expect(await offeneAnzahl(a)).toBe(1);
    await synchronisiere(netz(server), a);
    expect(await offeneAnzahl(a)).toBe(0);
    expect((await server.lies('baeume', 'b-1'))?.daten.notiz).toBe('während');
  });

  it('der Lesezeiger sorgt dafür, dass nur Neues übertragen wird', async () => {
    const server = speicherImArbeitsspeicher();
    const a = geraet();
    const b = geraet();
    await a.baeume.bulkPut([baum('b-1', T1), baum('b-2', T1)]);
    await synchronisiere(netz(server), a);
    await synchronisiere(netz(server), b);
    await a.baeume.put(baum('b-3', T2));
    await synchronisiere(netz(server), a);
    expect(await synchronisiere(netz(server), b)).toMatchObject({ empfangen: 1, rev: 3 });
  });

  it('ungültige Antworten werden abgelehnt, ohne etwas zu ändern', async () => {
    const a = geraet();
    await a.baeume.put(baum('b-1', T1));
    await expect(synchronisiere(async () => ({ rev: 'x' }), a)).rejects.toThrow();
    await expect(synchronisiere(async () => null, a)).rejects.toThrow();
    expect(await offeneAnzahl(a)).toBe(1);
    expect((await ladeSyncMeta(a)).rev).toBe(0);
  });
});
