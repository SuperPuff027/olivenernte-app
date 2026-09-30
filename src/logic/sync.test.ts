import { describe, expect, it } from 'vitest';
import {
  gewinnt,
  offeneAenderungen,
  pruefeDatensatz,
  schluesselVon,
  speicherImArbeitsspeicher,
  verarbeiteAnfrage,
  type SyncDatensatz,
} from './sync';

const baum = (id: string, aktualisiert_am: string, weitere: Record<string, unknown> = {}): SyncDatensatz => ({
  tabelle: 'baeume',
  schluessel: id,
  daten: { id, nummer: id, aktualisiert_am, geloescht: false, ...weitere },
});

describe('schluesselVon', () => {
  it('id bzw. baum_id|jahr beim Saisonstatus', () => {
    expect(schluesselVon('baeume', { id: 'b-1' })).toBe('b-1');
    expect(schluesselVon('hain', { id: 'hain' })).toBe('hain');
    expect(schluesselVon('saison_status', { baum_id: 'b-1', jahr: 2026 })).toBe('b-1|2026');
  });

  it('null bei fehlendem oder ungültigem Schlüssel', () => {
    expect(schluesselVon('baeume', {})).toBeNull();
    expect(schluesselVon('baeume', { id: '' })).toBeNull();
    expect(schluesselVon('saison_status', { baum_id: 'b-1', jahr: '2026' })).toBeNull();
  });
});

describe('gewinnt', () => {
  const alt = baum('b-1', '2026-10-01T10:00:00.000Z', { notiz: 'a' }).daten;
  const neu = baum('b-1', '2026-10-01T10:00:01.000Z', { notiz: 'b' }).daten;

  it('der neuere Zeitstempel gewinnt', () => {
    expect(gewinnt(neu, alt)).toBe(true);
    expect(gewinnt(alt, neu)).toBe(false);
  });

  it('gleicher Zeitstempel: eindeutige Entscheidung nach Inhalt, unabhängig von der Reihenfolge', () => {
    const x = baum('b-1', '2026-10-01T10:00:00.000Z', { notiz: 'x' }).daten;
    const y = baum('b-1', '2026-10-01T10:00:00.000Z', { notiz: 'y' }).daten;
    expect(gewinnt(x, y)).not.toBe(gewinnt(y, x));
  });

  it('gleicher Inhalt gewinnt nicht; Reihenfolge der Felder spielt keine Rolle', () => {
    const umsortiert = { geloescht: false, notiz: 'a', aktualisiert_am: alt.aktualisiert_am, nummer: 'b-1', id: 'b-1' };
    expect(gewinnt(alt, umsortiert)).toBe(false);
    expect(gewinnt(umsortiert, alt)).toBe(false);
  });

  it('ein gültiger Zeitstempel schlägt einen ungültigen', () => {
    const kaputt = { ...alt, aktualisiert_am: 'kaputt' };
    expect(gewinnt(alt, kaputt)).toBe(true);
    expect(gewinnt(kaputt, alt)).toBe(false);
  });
});

describe('offeneAenderungen', () => {
  it('alles, was der Server in dieser Fassung noch nicht bestätigt hat', () => {
    const lokal = [baum('a', '2026-10-01T10:00:00.000Z'), baum('b', '2026-10-02T10:00:00.000Z'), baum('c', '2020-01-01T00:00:00.000Z')];
    const bestaetigt = new Map([
      ['baeume/a', '2026-10-01T10:00:00.000Z'],
      ['baeume/b', '2026-10-01T09:00:00.000Z'],
    ]);
    // c: noch nie gesehen (z. B. mit altem Zeitstempel importiert) → wird trotzdem gesendet
    expect(offeneAenderungen(lokal, bestaetigt).map((d) => d.schluessel)).toEqual(['b', 'c']);
  });
});

describe('pruefeDatensatz', () => {
  it('nimmt gültige Datensätze an', () => {
    const d = baum('b-1', '2026-10-01T10:00:00.000Z');
    expect(pruefeDatensatz(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it('lehnt unbekannte Tabellen, falsche Schlüssel und fehlende Pflichtfelder ab', () => {
    const d = baum('b-1', '2026-10-01T10:00:00.000Z');
    expect(pruefeDatensatz({ ...d, tabelle: 'einstellungen' })).toBeNull();
    expect(pruefeDatensatz({ ...d, schluessel: 'b-2' })).toBeNull();
    expect(pruefeDatensatz({ ...d, daten: { ...d.daten, aktualisiert_am: 'gestern' } })).toBeNull();
    expect(pruefeDatensatz({ ...d, daten: { ...d.daten, geloescht: 'nein' } })).toBeNull();
    expect(pruefeDatensatz(null)).toBeNull();
  });
});

describe('verarbeiteAnfrage (Server)', () => {
  it('speichert Neues, liefert Revision und Änderungen anderer Geräte', async () => {
    const server = speicherImArbeitsspeicher();
    const a = await verarbeiteAnfrage(server, { seit: 0, aenderungen: [baum('b-1', '2026-10-01T10:00:00.000Z')] });
    expect(a.rev).toBe(1);
    expect(a.datensaetze.map((d) => d.schluessel)).toEqual(['b-1']);

    const b = await verarbeiteAnfrage(server, { seit: 0, aenderungen: [baum('b-2', '2026-10-01T11:00:00.000Z')] });
    expect(b.rev).toBe(2);
    expect(b.datensaetze.map((d) => d.schluessel).sort()).toEqual(['b-1', 'b-2']);

    // Gerät A kennt bis Revision 1 und bekommt nur B's Baum
    const c = await verarbeiteAnfrage(server, { seit: 1, aenderungen: [] });
    expect(c).toEqual({ rev: 2, datensaetze: [baum('b-2', '2026-10-01T11:00:00.000Z')] });
  });

  it('eine veraltete Änderung wird nicht gespeichert; das Gerät bekommt die neuere Fassung zurück', async () => {
    const server = speicherImArbeitsspeicher();
    await verarbeiteAnfrage(server, { seit: 0, aenderungen: [baum('b-1', '2026-10-02T10:00:00.000Z', { notiz: 'neu' })] });
    const antwort = await verarbeiteAnfrage(server, {
      seit: 1,
      aenderungen: [baum('b-1', '2026-10-01T10:00:00.000Z', { notiz: 'alt' })],
    });
    expect(antwort.rev).toBe(1);
    expect(antwort.datensaetze).toEqual([baum('b-1', '2026-10-02T10:00:00.000Z', { notiz: 'neu' })]);
  });
});
