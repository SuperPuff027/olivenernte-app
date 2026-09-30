// Abgleich zwischen Geräten über einen Server. Regel: pro Datensatz gewinnt der neuere
// `aktualisiert_am`. Die Server-Revision (fortlaufende Zahl) dient nur als Lesezeiger,
// damit keine Änderung verloren geht, auch wenn Geräteuhren leicht abweichen.
//
// Diese Datei enthält nur reine Logik: das Protokoll, die Konfliktregel und die Verarbeitung
// auf dem Server (über eine Speicher-Schnittstelle). Der Cloudflare Worker nutzt denselben Code;
// die Tests nutzen ihn als simulierten Server.

/** Tabellen, die abgeglichen werden (Geräte-Einstellungen und Sensoren nicht). */
export const SYNC_TABELLEN = ['grundstuecke', 'sorten', 'baeume', 'saison_status', 'hain'] as const;
export type SyncTabelle = (typeof SYNC_TABELLEN)[number];

/** Ein Datensatz, wie er übertragen wird: vollständiger Inhalt inkl. aktualisiert_am und geloescht. */
export interface SyncDatensatz {
  tabelle: SyncTabelle;
  /** id bzw. „baum_id|jahr“ beim Saisonstatus */
  schluessel: string;
  daten: Record<string, unknown> & { aktualisiert_am: string; geloescht: boolean };
}

export interface SyncAnfrage {
  /** Server-Revision, bis zu der das Gerät alles kennt (0 = noch nie abgeglichen) */
  seit: number;
  aenderungen: SyncDatensatz[];
}

export interface SyncAntwort {
  /** Neue Revision (Lesezeiger für den nächsten Abgleich) */
  rev: number;
  /** Alles Neue seit `seit` sowie die gültige Server-Fassung jedes gesendeten Datensatzes */
  datensaetze: SyncDatensatz[];
}

export function istSyncTabelle(wert: unknown): wert is SyncTabelle {
  return typeof wert === 'string' && (SYNC_TABELLEN as readonly string[]).includes(wert);
}

/** Schlüssel eines Datensatzes seiner Tabelle; null, wenn die Daten keinen gültigen Schlüssel haben. */
export function schluesselVon(tabelle: SyncTabelle, daten: Record<string, unknown>): string | null {
  if (tabelle === 'saison_status') {
    const { baum_id, jahr } = daten;
    return typeof baum_id === 'string' && baum_id !== '' && Number.isInteger(jahr) ? `${baum_id}|${String(jahr)}` : null;
  }
  const { id } = daten;
  return typeof id === 'string' && id !== '' ? id : null;
}

/** Stabile Textform (sortierte Schlüssel) für einen eindeutigen Gleichstand-Entscheid. */
function stabil(wert: unknown): string {
  if (Array.isArray(wert)) return `[${wert.map(stabil).join(',')}]`;
  if (wert !== null && typeof wert === 'object') {
    const obj = wert as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stabil(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(wert) ?? 'null';
}

/**
 * Gewinnt Fassung a gegen b? Neuerer `aktualisiert_am` gewinnt. Bei gleichem Zeitpunkt entscheidet
 * der Inhalt (größere stabile Textform), damit alle Geräte und der Server gleich entscheiden.
 * Gleicher Inhalt gewinnt nicht (nichts zu tun).
 */
export function gewinnt(a: SyncDatensatz['daten'], b: SyncDatensatz['daten']): boolean {
  const ta = Date.parse(a.aktualisiert_am);
  const tb = Date.parse(b.aktualisiert_am);
  const gueltigA = Number.isFinite(ta);
  const gueltigB = Number.isFinite(tb);
  // Ein gültiger Zeitstempel schlägt einen ungültigen.
  if (gueltigA !== gueltigB) return gueltigA;
  if (gueltigA && ta !== tb) return ta > tb;
  return stabil(a) > stabil(b);
}

/** Schlüssel für Nachschlagetabellen: „tabelle/schluessel“ */
export function kennung(tabelle: SyncTabelle, schluessel: string): string {
  return `${tabelle}/${schluessel}`;
}

/**
 * Lokale Datensätze, die gesendet werden müssen: alle, deren `aktualisiert_am` von der zuletzt
 * vom Server bestätigten Fassung abweicht (oder die der Server noch nie gesehen hat).
 */
export function offeneAenderungen(
  lokal: readonly SyncDatensatz[],
  bestaetigt: ReadonlyMap<string, string>,
): SyncDatensatz[] {
  return lokal.filter((d) => bestaetigt.get(kennung(d.tabelle, d.schluessel)) !== d.daten.aktualisiert_am);
}

/** Prüft einen übertragenen Datensatz (Tabelle, Schlüssel passend zu den Daten, Pflichtfelder). */
export function pruefeDatensatz(wert: unknown): SyncDatensatz | null {
  if (typeof wert !== 'object' || wert === null) return null;
  const { tabelle, schluessel, daten } = wert as Record<string, unknown>;
  if (!istSyncTabelle(tabelle) || typeof schluessel !== 'string') return null;
  if (typeof daten !== 'object' || daten === null || Array.isArray(daten)) return null;
  const d = daten as Record<string, unknown>;
  if (typeof d.aktualisiert_am !== 'string' || !Number.isFinite(Date.parse(d.aktualisiert_am))) return null;
  if (typeof d.geloescht !== 'boolean') return null;
  if (schluesselVon(tabelle, d) !== schluessel) return null;
  return { tabelle, schluessel, daten: d as SyncDatensatz['daten'] };
}

/** Speicher des Servers (im Worker: D1; in Tests: im Speicher). */
export interface ServerSpeicher {
  /** Gespeicherte Fassung eines Datensatzes */
  lies(tabelle: SyncTabelle, schluessel: string): Promise<SyncDatensatz | null>;
  /** Speichert einen Datensatz unter einer neuen Revision und gibt sie zurück. */
  schreibe(datensatz: SyncDatensatz): Promise<number>;
  /** Alle Datensätze mit Revision > seit */
  seit(rev: number): Promise<SyncDatensatz[]>;
  /** Höchste vergebene Revision (0 = leer) */
  revision(): Promise<number>;
}

/**
 * Verarbeitung einer Anfrage auf dem Server: eingehende Datensätze nur speichern, wenn sie gegen
 * die gespeicherte Fassung gewinnen; Antwort mit allem seit `seit` plus der gültigen Fassung
 * jedes gesendeten Datensatzes (so bekommt ein Gerät mit veralteter Änderung die neuere zurück).
 */
export async function verarbeiteAnfrage(speicher: ServerSpeicher, anfrage: SyncAnfrage): Promise<SyncAntwort> {
  const gueltig: SyncDatensatz[] = [];
  for (const d of anfrage.aenderungen) {
    const alt = await speicher.lies(d.tabelle, d.schluessel);
    if (!alt || gewinnt(d.daten, alt.daten)) await speicher.schreibe(d);
    gueltig.push((await speicher.lies(d.tabelle, d.schluessel)) ?? d);
  }
  const neu = await speicher.seit(Math.max(0, anfrage.seit));
  const nachKennung = new Map<string, SyncDatensatz>();
  for (const d of [...neu, ...gueltig]) nachKennung.set(kennung(d.tabelle, d.schluessel), d);
  return { rev: await speicher.revision(), datensaetze: [...nachKennung.values()] };
}

/** Einfacher Server-Speicher im Arbeitsspeicher (für Tests und als Vorlage). */
export function speicherImArbeitsspeicher(): ServerSpeicher {
  const daten = new Map<string, { datensatz: SyncDatensatz; rev: number }>();
  let rev = 0;
  return {
    lies: async (tabelle, schluessel) => structuredClone(daten.get(kennung(tabelle, schluessel))?.datensatz ?? null),
    schreibe: async (datensatz) => {
      rev++;
      daten.set(kennung(datensatz.tabelle, datensatz.schluessel), { datensatz: structuredClone(datensatz), rev });
      return rev;
    },
    seit: async (seitRev) =>
      [...daten.values()]
        .filter((e) => e.rev > seitRev)
        .sort((a, b) => a.rev - b.rev)
        .map((e) => structuredClone(e.datensatz)),
    revision: async () => rev,
  };
}
