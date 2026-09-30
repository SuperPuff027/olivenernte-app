import type { GelesenerImport, ImportBaum, Uebersprungen } from './importGeojson';

// Import von Bäumen aus einer Tabelle (CSV aus Excel, LibreOffice, Google Tabellen oder dem
// eigenen CSV-Export). Ergebnis hat dieselbe Form wie der GeoJSON-Import, damit Vorschau und
// Abgleich (vorhandene Nummern überspringen, Sorten anlegen) gleich bleiben.

export type CsvLeseFehler = 'leer' | 'spalten_fehlen';
export type CsvLeseErgebnis = { ok: true; daten: GelesenerImport } | { ok: false; fehler: CsvLeseFehler };

const BOM = String.fromCharCode(0xfeff);
const TRENNER = [';', ',', '\t'] as const;

/** Trennzeichen aus der Kopfzeile: das häufigste außerhalb von Anführungszeichen. */
export function erkenneTrenner(kopfzeile: string): string {
  const zaehler = new Map<string, number>(TRENNER.map((t) => [t, 0]));
  let inAnfuehrung = false;
  for (const zeichen of kopfzeile) {
    if (zeichen === '"') inAnfuehrung = !inAnfuehrung;
    else if (!inAnfuehrung && zaehler.has(zeichen)) zaehler.set(zeichen, (zaehler.get(zeichen) ?? 0) + 1);
  }
  let bester: string = ';';
  for (const t of TRENNER) if ((zaehler.get(t) ?? 0) > (zaehler.get(bester) ?? 0)) bester = t;
  return bester;
}

/** CSV nach RFC 4180 (Anführungszeichen, "" als Escape, Umbrüche in Zellen, CRLF oder LF). */
export function zerlegeCsv(text: string): string[][] {
  const quelle = text.startsWith(BOM) ? text.slice(1) : text;
  const ersteZeile = quelle.split(/\r?\n/, 1)[0] ?? '';
  const trenner = erkenneTrenner(ersteZeile);
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let zelle = '';
  let inAnfuehrung = false;
  for (let i = 0; i < quelle.length; i++) {
    const z = quelle[i];
    if (inAnfuehrung) {
      if (z === '"' && quelle[i + 1] === '"') {
        zelle += '"';
        i++;
      } else if (z === '"') inAnfuehrung = false;
      else zelle += z;
    } else if (z === '"') inAnfuehrung = true;
    else if (z === trenner) {
      zeile.push(zelle);
      zelle = '';
    } else if (z === '\n' || z === '\r') {
      if (z === '\r' && quelle[i + 1] === '\n') i++;
      zeile.push(zelle);
      zeilen.push(zeile);
      zeile = [];
      zelle = '';
    } else zelle += z;
  }
  if (zelle !== '' || zeile.length > 0) {
    zeile.push(zelle);
    zeilen.push(zeile);
  }
  return zeilen;
}

type Feld = 'nummer' | 'breite' | 'laenge' | 'sorte' | 'notiz' | 'gps' | 'hoehe' | 'id';

/** Mögliche Überschriften (normalisiert) je Feld, in Deutsch, Englisch und Türkisch. */
const UEBERSCHRIFTEN: Record<Feld, string[]> = {
  nummer: ['nummer', 'nr', 'baum', 'baumnummer', 'number', 'no', 'tree', 'treenumber', 'numara', 'agac', 'agacno'],
  breite: ['breite', 'breitengrad', 'lat', 'latitude', 'enlem'],
  laenge: ['laenge', 'laengengrad', 'lon', 'lng', 'long', 'longitude', 'boylam'],
  sorte: ['sorte', 'variety', 'cultivar', 'cesit'],
  notiz: ['notiz', 'bemerkung', 'note', 'notes', 'not', 'aciklama'],
  gps: ['gpsgenauigkeit', 'genauigkeit', 'gpsaccuracy', 'accuracy', 'gpsdogrulugu', 'dogruluk'],
  hoehe: ['hoehe', 'elevation', 'altitude', 'yukseklik'],
  id: ['id', 'baumid', 'treeid', 'agacid'],
};

const ERSATZ: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', ı: 'i', ş: 's', ç: 'c', ğ: 'g' };

/** Überschrift vergleichbar machen: klein, ohne Klammerzusätze, Jahreszahlen, Akzente und Sonderzeichen. */
export function normiereUeberschrift(text: string): string {
  // Türkisches ö/ü werden zu o/u; deutsches ä/ö/ü zu ae/oe/ue – beide Schreibweisen sind in der Liste.
  const klein = text.replace(/\([^)]*\)/g, '').toLowerCase();
  const ersetzt = [...klein].map((z) => ERSATZ[z] ?? z).join('');
  return ersetzt
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z]/g, '');
}

function spaltenZuordnung(kopf: readonly string[]): Partial<Record<Feld, number>> {
  const zuordnung: Partial<Record<Feld, number>> = {};
  kopf.forEach((roh, index) => {
    const name = normiereUeberschrift(roh);
    // Türkisch „Doluluk“ usw. werden ignoriert; ebenso Status- und Ertragsspalten.
    const varianten = [name, name.replace(/oe/g, 'o').replace(/ue/g, 'u')];
    for (const [feld, namen] of Object.entries(UEBERSCHRIFTEN) as [Feld, string[]][]) {
      if (zuordnung[feld] === undefined && varianten.some((v) => namen.includes(v))) zuordnung[feld] = index;
    }
  });
  return zuordnung;
}

/** Dezimalzahl mit Komma oder Punkt (ohne Tausendertrennung), sonst null. */
export function leseDezimal(text: string): number | null {
  const t = text.trim();
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return null;
  const zahl = Number(t.replace(',', '.'));
  return Number.isFinite(zahl) ? zahl : null;
}

/** Text einer Zelle; ein Apostroph vom Excel-Formelschutz des eigenen Exports wird entfernt. */
function textZelle(wert: string | undefined): string {
  const t = (wert ?? '').trim();
  return /^'[=+\-@]/.test(t) ? t.slice(1) : t;
}

const MAX_ID_LAENGE = 100;

export function leseCsvBaeume(text: string): CsvLeseErgebnis {
  const zeilen = zerlegeCsv(text).filter((z) => z.some((zelle) => zelle.trim() !== ''));
  const [kopf, ...daten] = zeilen;
  if (!kopf || daten.length === 0) return { ok: false, fehler: 'leer' };
  const spalte = spaltenZuordnung(kopf);
  if (spalte.nummer === undefined || spalte.breite === undefined || spalte.laenge === undefined) {
    return { ok: false, fehler: 'spalten_fehlen' };
  }
  const wert = (zeile: readonly string[], feld: Feld) => {
    const i = spalte[feld];
    return i === undefined ? '' : textZelle(zeile[i]);
  };

  const baeume: (ImportBaum & { nr: number })[] = [];
  const uebersprungen: Uebersprungen[] = [];
  const gesehen = new Set<string>();
  daten.forEach((zeile, index) => {
    // Zeilennummer wie im Tabellenprogramm (Kopfzeile = 1)
    const nr = index + 2;
    const nummer = wert(zeile, 'nummer') || null;
    const lat = leseDezimal(wert(zeile, 'breite'));
    const lon = leseDezimal(wert(zeile, 'laenge'));
    if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      uebersprungen.push({ nr, nummer, grund: 'ungueltige_geometrie' });
      return;
    }
    if (!nummer) {
      uebersprungen.push({ nr, nummer: null, grund: 'ohne_nummer' });
      return;
    }
    if (gesehen.has(nummer)) {
      uebersprungen.push({ nr, nummer, grund: 'nummer_doppelt' });
      return;
    }
    gesehen.add(nummer);
    const genauigkeit = leseDezimal(wert(zeile, 'gps'));
    const id = wert(zeile, 'id');
    baeume.push({
      nr,
      id: id !== '' && id.length <= MAX_ID_LAENGE ? id : null,
      nummer,
      lat,
      lon,
      hoehe_m: leseDezimal(wert(zeile, 'hoehe')),
      gps_genauigkeit_m: genauigkeit !== null && genauigkeit >= 0 ? genauigkeit : null,
      sorte: wert(zeile, 'sorte') || null,
      notiz: wert(zeile, 'notiz'),
      aktualisiert_am: null,
      saison: [],
    });
  });

  if (baeume.length === 0 && uebersprungen.length === 0) return { ok: false, fehler: 'leer' };
  return { ok: true, daten: { grundstueck: null, baeume, sorten: [], uebersprungen } };
}
