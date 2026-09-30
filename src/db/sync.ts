import {
  gewinnt,
  offeneAenderungen,
  pruefeDatensatz,
  schluesselVon,
  SYNC_TABELLEN,
  type SyncAnfrage,
  type SyncAntwort,
  type SyncDatensatz,
  type SyncTabelle,
} from '../logic/sync';
import { SYNC_META_ID, type SyncMeta } from '../model/typen';
import { db as standardDb, type OlivenDatenbank } from './datenbank';

/** Überträgt eine Anfrage zum Server (im Betrieb per fetch, in Tests direkt). */
export type SyncTransport = (anfrage: SyncAnfrage) => Promise<unknown>;

export interface SyncErgebnis {
  gesendet: number;
  empfangen: number;
  rev: number;
}

function tabelle(d: OlivenDatenbank, name: SyncTabelle) {
  return d.table(name);
}

/** Primärschlüssel in Dexie (Saisonstatus: [baum_id, jahr]) */
function dexieSchluessel(datensatz: SyncDatensatz): string | [string, number] {
  if (datensatz.tabelle === 'saison_status') {
    return [datensatz.daten.baum_id as string, datensatz.daten.jahr as number];
  }
  return datensatz.schluessel;
}

/** Alle Datensätze der abgeglichenen Tabellen, auch gelöschte (Löschungen müssen mit). */
export async function sammleLokal(d: OlivenDatenbank = standardDb): Promise<SyncDatensatz[]> {
  const alle: SyncDatensatz[] = [];
  for (const name of SYNC_TABELLEN) {
    for (const daten of (await tabelle(d, name).toArray()) as SyncDatensatz['daten'][]) {
      const schluessel = schluesselVon(name, daten);
      if (schluessel) alle.push({ tabelle: name, schluessel, daten });
    }
  }
  return alle;
}

async function bestaetigteFassungen(d: OlivenDatenbank): Promise<Map<string, string>> {
  const stand = await d.sync_stand.toArray();
  return new Map(stand.map((s) => [`${s.tabelle}/${s.schluessel}`, s.aktualisiert_am]));
}

export async function ladeSyncMeta(d: OlivenDatenbank = standardDb): Promise<SyncMeta> {
  return (await d.sync_meta.get(SYNC_META_ID)) ?? { id: SYNC_META_ID, rev: 0, letzter_abgleich: null };
}

/** Anzahl lokaler Änderungen, die der Server noch nicht hat. */
export async function offeneAnzahl(d: OlivenDatenbank = standardDb): Promise<number> {
  return offeneAenderungen(await sammleLokal(d), await bestaetigteFassungen(d)).length;
}

/** Prüft die Server-Antwort; ungültige Datensätze werden verworfen. */
function pruefeAntwort(roh: unknown): SyncAntwort {
  if (typeof roh !== 'object' || roh === null) throw new Error('Ungültige Antwort');
  const { rev, datensaetze } = roh as Record<string, unknown>;
  if (typeof rev !== 'number' || !Number.isInteger(rev) || rev < 0 || !Array.isArray(datensaetze)) {
    throw new Error('Ungültige Antwort');
  }
  return {
    rev,
    datensaetze: datensaetze.map(pruefeDatensatz).filter((x): x is SyncDatensatz => x !== null),
  };
}

/**
 * Ein Abgleich: offene Änderungen senden, Antwort übernehmen. Pro Datensatz gewinnt der neuere
 * `aktualisiert_am`; die Server-Fassung wird als bestätigt gemerkt. Wurde ein Datensatz während
 * der Übertragung lokal geändert, gewinnt die lokale Fassung und wird beim nächsten Mal gesendet.
 */
export async function synchronisiere(transport: SyncTransport, d: OlivenDatenbank = standardDb): Promise<SyncErgebnis> {
  const meta = await ladeSyncMeta(d);
  const aenderungen = offeneAenderungen(await sammleLokal(d), await bestaetigteFassungen(d));
  const antwort = pruefeAntwort(await transport({ seit: meta.rev, aenderungen }));

  let empfangen = 0;
  const tabellen = [...SYNC_TABELLEN.map((n) => tabelle(d, n)), d.sync_stand, d.sync_meta];
  await d.transaction('rw', tabellen, async () => {
    for (const eingang of antwort.datensaetze) {
      const t = tabelle(d, eingang.tabelle);
      const lokal = (await t.get(dexieSchluessel(eingang))) as SyncDatensatz['daten'] | undefined;
      if (!lokal || gewinnt(eingang.daten, lokal)) {
        await t.put(eingang.daten);
        empfangen++;
      }
      await d.sync_stand.put({
        tabelle: eingang.tabelle,
        schluessel: eingang.schluessel,
        aktualisiert_am: eingang.daten.aktualisiert_am,
      });
    }
    await d.sync_meta.put({
      id: SYNC_META_ID,
      rev: Math.max(meta.rev, antwort.rev),
      letzter_abgleich: new Date().toISOString(),
    });
  });
  return { gesendet: aenderungen.length, empfangen, rev: Math.max(meta.rev, antwort.rev) };
}
