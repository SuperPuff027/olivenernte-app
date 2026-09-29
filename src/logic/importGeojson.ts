import {
  ERNTE_STATUS,
  type Baum,
  type ErnteStatus,
  type GeoJsonPolygon,
  type Grundstueck,
  type Position,
  type SaisonStatus,
  type Sorte,
} from '../model/typen';
import { istHexFarbe, naechsteRingfarbe } from './sorten';
import type { Sprache } from './sprache';
import { vergleiche } from './text';

// Liest GeoJSON (z. B. testdaten/hain.geojson oder den eigenen Export) und plant den Import.
// Erkennt Features an properties.typ ("grundstueck" / "baum"), sonst an der Geometrie.
// Der eigene Export enthält zusätzlich IDs, Zeitstempel, Sorten mit Farben (Mitglied „hrvst“
// der FeatureCollection) und den Saisonstatus je Baum; damit ist eine vollständige
// Wiederherstellung möglich. Fremde Dateien ohne diese Angaben funktionieren weiterhin.

/** Name des zusätzlichen Mitglieds der FeatureCollection mit App-Daten */
export const APP_MITGLIED = 'hrvst';

export interface ImportGrundstueck {
  id: string | null;
  name: string;
  polygon: GeoJsonPolygon;
  aktualisiert_am: string | null;
}

export interface ImportSaison {
  jahr: number;
  status: ErnteStatus;
  fuellstand: number | null;
  ertrag_kg: number | null;
  erntedatum: string | null;
  aktualisiert_am: string | null;
}

export interface ImportBaum {
  id: string | null;
  nummer: string;
  lat: number;
  lon: number;
  hoehe_m: number | null;
  gps_genauigkeit_m: number | null;
  sorte: string | null;
  notiz: string;
  aktualisiert_am: string | null;
  saison: ImportSaison[];
}

export interface ImportSorte {
  id: string | null;
  name: string;
  ringfarbe: string | null;
  aktualisiert_am: string | null;
}

export type UebersprungGrund =
  | 'unbekannter_typ'
  | 'ungueltige_geometrie'
  | 'ohne_nummer'
  | 'nummer_doppelt'
  | 'nummer_vorhanden'
  | 'weiteres_grundstueck';

export interface Uebersprungen {
  /** Position des Features in der Datei (ab 1). */
  nr: number;
  nummer: string | null;
  grund: UebersprungGrund;
}

export interface GelesenerImport {
  grundstueck: ImportGrundstueck | null;
  baeume: (ImportBaum & { nr: number })[];
  /** Sortenliste aus dem eigenen Export (Farben, auch Sorten ohne Bäume) */
  sorten: ImportSorte[];
  uebersprungen: Uebersprungen[];
}

export type LeseFehler = 'kein_geojson' | 'leer';

export type LeseErgebnis = { ok: true; daten: GelesenerImport } | { ok: false; fehler: LeseFehler };

export const STANDARD_GRUNDSTUECK_NAME = 'Grundstück';

const MAX_ID_LAENGE = 100;

type Objekt = Record<string, unknown>;

function istObjekt(wert: unknown): wert is Objekt {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert);
}

function alsText(wert: unknown): string | null {
  if (typeof wert === 'number' && Number.isFinite(wert)) return String(wert);
  if (typeof wert !== 'string') return null;
  const text = wert.trim();
  return text === '' ? null : text;
}

function alsZahl(wert: unknown): number | null {
  return typeof wert === 'number' && Number.isFinite(wert) ? wert : null;
}

function alsId(wert: unknown): string | null {
  const text = typeof wert === 'string' ? wert.trim() : '';
  return text !== '' && text.length <= MAX_ID_LAENGE ? text : null;
}

/** Gültiger Zeitpunkt, normalisiert auf ISO; sonst null. */
function alsZeitpunkt(wert: unknown): string | null {
  if (typeof wert !== 'string') return null;
  const ms = Date.parse(wert);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function alsDatum(wert: unknown): string | null {
  return typeof wert === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(wert) && Number.isFinite(Date.parse(wert)) ? wert : null;
}

function alsSaison(wert: unknown): ImportSaison | null {
  if (!istObjekt(wert)) return null;
  const jahr = alsZahl(wert.jahr);
  const status = ERNTE_STATUS.find((s) => s === wert.status);
  if (jahr === null || !Number.isInteger(jahr) || !status) return null;
  const fuellstand = alsZahl(wert.fuellstand);
  const ertrag = alsZahl(wert.ertrag_kg);
  return {
    jahr,
    status,
    fuellstand: fuellstand !== null && Number.isInteger(fuellstand) && fuellstand >= 1 ? fuellstand : null,
    ertrag_kg: ertrag !== null && ertrag >= 0 ? ertrag : null,
    erntedatum: alsDatum(wert.erntedatum),
    aktualisiert_am: alsZeitpunkt(wert.aktualisiert_am),
  };
}

function alsSaisonListe(wert: unknown): ImportSaison[] {
  if (!Array.isArray(wert)) return [];
  const nachJahr = new Map<number, ImportSaison>();
  for (const roh of wert) {
    const s = alsSaison(roh);
    if (s && !nachJahr.has(s.jahr)) nachJahr.set(s.jahr, s);
  }
  return [...nachJahr.values()];
}

function alsSortenListe(json: Objekt): ImportSorte[] {
  const app = json[APP_MITGLIED];
  if (!istObjekt(app) || !Array.isArray(app.sorten)) return [];
  const sorten: ImportSorte[] = [];
  for (const roh of app.sorten) {
    if (!istObjekt(roh)) continue;
    const name = alsText(roh.name);
    if (!name) continue;
    const farbe = typeof roh.ringfarbe === 'string' && istHexFarbe(roh.ringfarbe) ? roh.ringfarbe.toLowerCase() : null;
    sorten.push({ id: alsId(roh.id), name, ringfarbe: farbe, aktualisiert_am: alsZeitpunkt(roh.aktualisiert_am) });
  }
  return sorten;
}

function alsPosition(wert: unknown): Position | null {
  if (!Array.isArray(wert) || wert.length < 2) return null;
  const [lon, lat, hoehe] = wert;
  if (typeof lon !== 'number' || typeof lat !== 'number') return null;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
  return typeof hoehe === 'number' && Number.isFinite(hoehe) ? [lon, lat, hoehe] : [lon, lat];
}

/** Äußerer Ring mit mindestens 3 verschiedenen Punkten; wird bei Bedarf geschlossen. Löcher werden ignoriert. */
function alsPolygon(geometrie: Objekt): GeoJsonPolygon | null {
  const ringe = geometrie.coordinates;
  if (!Array.isArray(ringe) || !Array.isArray(ringe[0])) return null;
  const ring: Position[] = [];
  for (const roh of ringe[0] as unknown[]) {
    const p = alsPosition(roh);
    if (!p) return null;
    ring.push(p);
  }
  const erster = ring[0];
  const letzter = ring[ring.length - 1];
  if (erster && letzter && (erster[0] !== letzter[0] || erster[1] !== letzter[1])) {
    ring.push([...erster] as Position);
  }
  if (ring.length < 4) return null;
  return { type: 'Polygon', coordinates: [ring] };
}

function featureListe(json: unknown): unknown[] | null {
  if (!istObjekt(json)) return null;
  if (json.type === 'FeatureCollection' && Array.isArray(json.features)) return json.features;
  if (json.type === 'Feature') return [json];
  return null;
}

export function leseGeojson(json: unknown): LeseErgebnis {
  const features = featureListe(json);
  if (!features || !istObjekt(json)) return { ok: false, fehler: 'kein_geojson' };

  const daten: GelesenerImport = { grundstueck: null, baeume: [], sorten: alsSortenListe(json), uebersprungen: [] };
  const gesehen = new Set<string>();

  features.forEach((feature, index) => {
    const nr = index + 1;
    const eigenschaften = istObjekt(feature) && istObjekt(feature.properties) ? feature.properties : {};
    const geometrie = istObjekt(feature) && istObjekt(feature.geometry) ? feature.geometry : null;
    const typ = eigenschaften.typ ?? (geometrie?.type === 'Polygon' ? 'grundstueck' : geometrie?.type === 'Point' ? 'baum' : null);
    const nummer = alsText(eigenschaften.nummer);

    if (typ === 'grundstueck') {
      const polygon = geometrie?.type === 'Polygon' ? alsPolygon(geometrie) : null;
      if (!polygon) {
        daten.uebersprungen.push({ nr, nummer: null, grund: 'ungueltige_geometrie' });
      } else if (daten.grundstueck) {
        daten.uebersprungen.push({ nr, nummer: null, grund: 'weiteres_grundstueck' });
      } else {
        daten.grundstueck = {
          id: alsId(eigenschaften.id),
          name: alsText(eigenschaften.name) ?? STANDARD_GRUNDSTUECK_NAME,
          polygon,
          aktualisiert_am: alsZeitpunkt(eigenschaften.aktualisiert_am),
        };
      }
      return;
    }

    if (typ !== 'baum') {
      daten.uebersprungen.push({ nr, nummer, grund: 'unbekannter_typ' });
      return;
    }

    const position = geometrie?.type === 'Point' ? alsPosition(geometrie.coordinates) : null;
    if (!position) {
      daten.uebersprungen.push({ nr, nummer, grund: 'ungueltige_geometrie' });
      return;
    }
    if (!nummer) {
      daten.uebersprungen.push({ nr, nummer: null, grund: 'ohne_nummer' });
      return;
    }
    if (gesehen.has(nummer)) {
      daten.uebersprungen.push({ nr, nummer, grund: 'nummer_doppelt' });
      return;
    }
    gesehen.add(nummer);

    const genauigkeit = alsZahl(eigenschaften.gps_genauigkeit_m);
    daten.baeume.push({
      nr,
      id: alsId(eigenschaften.id),
      nummer,
      lon: position[0],
      lat: position[1],
      hoehe_m: alsZahl(eigenschaften.hoehe_m) ?? position[2] ?? null,
      gps_genauigkeit_m: genauigkeit !== null && genauigkeit >= 0 ? genauigkeit : null,
      sorte: alsText(eigenschaften.sorte),
      notiz: typeof eigenschaften.notiz === 'string' ? eigenschaften.notiz : '',
      aktualisiert_am: alsZeitpunkt(eigenschaften.aktualisiert_am),
      saison: alsSaisonListe(eigenschaften.saison),
    });
  });

  if (!daten.grundstueck && daten.baeume.length === 0) return { ok: false, fehler: 'leer' };
  return { ok: true, daten };
}

export interface Bestand {
  grundstuecke: readonly Grundstueck[];
  baeume: readonly Baum[];
  sorten: readonly Sorte[];
}

export interface ImportPlan {
  grundstueck: { datensatz: Grundstueck; ersetzt: boolean } | null;
  baeume: Baum[];
  neueSorten: Sorte[];
  saisonStatus: SaisonStatus[];
  uebersprungen: Uebersprungen[];
}

/**
 * Gleicht das Gelesene mit dem Bestand (nur aktive Datensätze) ab.
 * - Grundstück: ersetzt die Grenze des vorhandenen Grundstücks (gleiche ID), sonst neu.
 * - Bäume: Nummern, die es schon gibt, werden übersprungen (samt ihrem Saisonstatus).
 * - Sorten: Zuordnung über den Namen (ohne Groß-/Kleinschreibung); fehlende werden angelegt,
 *   mit der Farbe aus der Datei oder der nächsten freien Vorschlagsfarbe.
 * - IDs und Zeitstempel aus der Datei bleiben erhalten, sofern die ID nicht schon aktiv vergeben ist.
 */
export function planeImport(
  gelesen: GelesenerImport,
  bestand: Bestand,
  jetzt: Date,
  neueId: () => string,
  sprache: Sprache,
): ImportPlan {
  const zeit = jetzt.toISOString();
  const vorhandenesGrundstueck = bestand.grundstuecke[0] ?? null;
  const vergebeneIds = new Set([...bestand.grundstuecke, ...bestand.baeume, ...bestand.sorten].map((d) => d.id));
  const idFuer = (ausDatei: string | null) => {
    const id = ausDatei !== null && !vergebeneIds.has(ausDatei) ? ausDatei : neueId();
    vergebeneIds.add(id);
    return id;
  };

  let grundstueck: ImportPlan['grundstueck'] = null;
  if (gelesen.grundstueck) {
    grundstueck = {
      ersetzt: vorhandenesGrundstueck !== null,
      datensatz: {
        id: vorhandenesGrundstueck?.id ?? idFuer(gelesen.grundstueck.id),
        name: gelesen.grundstueck.name,
        polygon: gelesen.grundstueck.polygon,
        aktualisiert_am: gelesen.grundstueck.aktualisiert_am ?? zeit,
        geloescht: false,
      },
    };
  }
  const grundstueckId = grundstueck?.datensatz.id ?? vorhandenesGrundstueck?.id ?? null;

  const sorten = [...bestand.sorten];
  const neueSorten: Sorte[] = [];
  const sorteFuer = (name: string): string => {
    const treffer = sorten.find((s) => vergleiche(s.name, name, sprache) === 0);
    if (treffer) return treffer.id;
    const ausDatei = gelesen.sorten.find((s) => vergleiche(s.name, name, sprache) === 0);
    const neu: Sorte = {
      id: idFuer(ausDatei?.id ?? null),
      name: ausDatei?.name ?? name,
      ringfarbe: ausDatei?.ringfarbe ?? naechsteRingfarbe(sorten),
      aktualisiert_am: ausDatei?.aktualisiert_am ?? zeit,
      geloescht: false,
    };
    sorten.push(neu);
    neueSorten.push(neu);
    return neu.id;
  };

  const vorhandeneNummern = new Set(bestand.baeume.map((b) => b.nummer));
  const uebersprungen = [...gelesen.uebersprungen];
  const baeume: Baum[] = [];
  const saisonStatus: SaisonStatus[] = [];
  for (const b of gelesen.baeume) {
    if (vorhandeneNummern.has(b.nummer)) {
      uebersprungen.push({ nr: b.nr, nummer: b.nummer, grund: 'nummer_vorhanden' });
      continue;
    }
    const id = idFuer(b.id);
    baeume.push({
      id,
      nummer: b.nummer,
      grundstueck_id: grundstueckId,
      sorte_id: b.sorte ? sorteFuer(b.sorte) : null,
      lat: b.lat,
      lon: b.lon,
      gps_genauigkeit_m: b.gps_genauigkeit_m,
      hoehe_m: b.hoehe_m,
      notiz: b.notiz,
      aktualisiert_am: b.aktualisiert_am ?? zeit,
      geloescht: false,
    });
    for (const s of b.saison) {
      saisonStatus.push({
        baum_id: id,
        jahr: s.jahr,
        status: s.status,
        fuellstand: s.fuellstand,
        ertrag_kg: s.ertrag_kg,
        erntedatum: s.erntedatum,
        aktualisiert_am: s.aktualisiert_am ?? zeit,
        geloescht: false,
      });
    }
  }
  // Sorten aus der Sortenliste, die (noch) kein Baum hat, trotzdem übernehmen.
  for (const s of gelesen.sorten) sorteFuer(s.name);
  uebersprungen.sort((a, b) => a.nr - b.nr);

  return { grundstueck, baeume, neueSorten, saisonStatus, uebersprungen };
}
