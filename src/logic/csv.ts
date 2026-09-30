import type { ErnteStatus } from '../model/typen';
import type { ExportDaten } from './exportGeojson';
import type { Sprache } from './sprache';

// CSV-Export für Tabellenprogramme (Excel, LibreOffice, Google Tabellen).
// Deutsch/Türkisch: Semikolon und Dezimalkomma; Englisch: Komma und Dezimalpunkt.
// UTF-8 mit BOM (sonst zeigt Excel Umlaute und türkische Zeichen falsch), Zeilenende CRLF.

export type Zelle = string | number | null;

/** Byte-Order-Mark am Dateianfang, damit Excel UTF-8 erkennt */
const BOM = String.fromCharCode(0xfeff);
const ZEILENENDE = '\r\n';

export function trennzeichen(sprache: Sprache): string {
  return sprache === 'en' ? ',' : ';';
}

/** Nachkommastellen höchstens (7 = etwa 1 cm bei Koordinaten); entfernt Gleitkomma-Reste. */
const MAX_NACHKOMMA = 7;

/** Zahl ohne Tausendertrennung mit dem Dezimalzeichen der Sprache. */
function zahlText(wert: number, sprache: Sprache): string {
  const text = String(Number(wert.toFixed(MAX_NACHKOMMA)));
  return sprache === 'en' ? text : text.replace('.', ',');
}

/**
 * Eine Zelle als CSV-Text. Texte, die Excel als Formel ausführen würde (=, +, -, @ am Anfang),
 * bekommen ein Apostroph davor. Anführungszeichen, Trennzeichen und Zeilenumbrüche erzwingen
 * Anführungszeichen um die Zelle.
 */
export function csvZelle(wert: Zelle, sprache: Sprache): string {
  if (wert === null) return '';
  let text = typeof wert === 'number' ? zahlText(wert, sprache) : wert;
  if (typeof wert === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  const braucht = text.includes('"') || text.includes(trennzeichen(sprache)) || /[\r\n]/.test(text);
  return braucht ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvText(kopf: readonly string[], zeilen: readonly (readonly Zelle[])[], sprache: Sprache): string {
  const trenner = trennzeichen(sprache);
  const zeile = (werte: readonly Zelle[]) => werte.map((w) => csvZelle(w, sprache)).join(trenner);
  return BOM + [zeile(kopf), ...zeilen.map(zeile)].join(ZEILENENDE) + ZEILENENDE;
}

/** Spalten der Baumliste (Schlüssel; die Überschriften kommen aus den Übersetzungen). */
export const BAUM_SPALTEN = [
  'nummer',
  'sorte',
  'breite',
  'laenge',
  'gps_genauigkeit_m',
  'hoehe_m',
  'status',
  'fuellstand',
  'ertrag_kg',
  'erntedatum',
  'notiz',
  'id',
] as const;

/** Spalten der Ernte-Historie */
export const ERNTE_SPALTEN = ['nummer', 'sorte', 'saison', 'status', 'fuellstand', 'ertrag_kg', 'erntedatum', 'id'] as const;

export type CsvSpalte = (typeof BAUM_SPALTEN)[number] | (typeof ERNTE_SPALTEN)[number];

const nachNummer = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function sortenNamen(daten: ExportDaten): (sorteId: string | null) => string | null {
  const namen = new Map(daten.sorten.filter((s) => !s.geloescht).map((s) => [s.id, s.name]));
  return (id) => (id === null ? null : (namen.get(id) ?? null));
}

/** Eine Zeile pro aktivem Baum mit den Werten der angegebenen Saison. */
export function baumZeilen(daten: ExportDaten, saison: number, statusText: (s: ErnteStatus) => string): Zelle[][] {
  const sorteVon = sortenNamen(daten);
  const inSaison = new Map(
    daten.saisonStatus.filter((s) => !s.geloescht && s.jahr === saison).map((s) => [s.baum_id, s]),
  );
  return daten.baeume
    .filter((b) => !b.geloescht)
    .sort((a, b) => nachNummer(a.nummer, b.nummer))
    .map((b) => {
      const s = inSaison.get(b.id);
      const geerntet = s?.status === 'geerntet';
      return [
        b.nummer,
        sorteVon(b.sorte_id),
        b.lat,
        b.lon,
        b.gps_genauigkeit_m,
        b.hoehe_m,
        s ? statusText(s.status) : null,
        s?.fuellstand ?? null,
        geerntet ? (s.ertrag_kg ?? null) : null,
        geerntet ? (s.erntedatum ?? null) : null,
        b.notiz === '' ? null : b.notiz,
        b.id,
      ];
    });
}

/** Eine Zeile pro Baum und Saison (aktive Bäume und Einträge), Bäume nach Nummer, neueste Saison zuerst. */
export function ernteZeilen(daten: ExportDaten, statusText: (s: ErnteStatus) => string): Zelle[][] {
  const sorteVon = sortenNamen(daten);
  const baumNachId = new Map(daten.baeume.filter((b) => !b.geloescht).map((b) => [b.id, b]));
  return daten.saisonStatus
    .filter((s) => !s.geloescht && baumNachId.has(s.baum_id))
    .map((s) => ({ s, baum: baumNachId.get(s.baum_id)! }))
    .sort((x, y) => nachNummer(x.baum.nummer, y.baum.nummer) || y.s.jahr - x.s.jahr)
    .map(({ s, baum }) => {
      const geerntet = s.status === 'geerntet';
      return [
        baum.nummer,
        sorteVon(baum.sorte_id),
        s.jahr,
        statusText(s.status),
        s.fuellstand,
        geerntet ? s.ertrag_kg : null,
        geerntet ? s.erntedatum : null,
        baum.id,
      ];
    });
}

/** Dateiname mit lokalem Datum, z. B. „hrvst-ernte-2026-09-30.csv“. */
export function csvDateiname(art: 'baeume' | 'ernte', jetzt: Date): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `hrvst-${art}-${jetzt.getFullYear()}-${zwei(jetzt.getMonth() + 1)}-${zwei(jetzt.getDate())}.csv`;
}
