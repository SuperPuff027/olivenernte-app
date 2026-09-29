import type { Baum, GeoJsonPolygon, Grundstueck, Position, Sorte } from '../model/typen';
import type { Sprache } from './sprache';
import { vergleiche } from './text';

// Liest GeoJSON (z. B. testdaten/hain.geojson oder den eigenen Export) und plant den Import.
// Erkennt Features an properties.typ ("grundstueck" / "baum"), sonst an der Geometrie.

export interface ImportGrundstueck {
  name: string;
  polygon: GeoJsonPolygon;
}

export interface ImportBaum {
  nummer: string;
  lat: number;
  lon: number;
  hoehe_m: number | null;
  gps_genauigkeit_m: number | null;
  sorte: string | null;
  notiz: string;
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
  uebersprungen: Uebersprungen[];
}

export type LeseFehler = 'kein_geojson' | 'leer';

export type LeseErgebnis = { ok: true; daten: GelesenerImport } | { ok: false; fehler: LeseFehler };

export const STANDARD_GRUNDSTUECK_NAME = 'Grundstück';
/** Ringfarbe für Sorten, die der Import neu anlegt; in der Sortenverwaltung änderbar. */
export const NEUE_SORTE_FARBE = '#ffd600';

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
  if (!features) return { ok: false, fehler: 'kein_geojson' };

  const daten: GelesenerImport = { grundstueck: null, baeume: [], uebersprungen: [] };
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
        daten.grundstueck = { name: alsText(eigenschaften.name) ?? STANDARD_GRUNDSTUECK_NAME, polygon };
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
      nummer,
      lon: position[0],
      lat: position[1],
      hoehe_m: alsZahl(eigenschaften.hoehe_m) ?? position[2] ?? null,
      gps_genauigkeit_m: genauigkeit !== null && genauigkeit >= 0 ? genauigkeit : null,
      sorte: alsText(eigenschaften.sorte),
      notiz: typeof eigenschaften.notiz === 'string' ? eigenschaften.notiz : '',
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
  uebersprungen: Uebersprungen[];
}

/**
 * Gleicht das Gelesene mit dem Bestand (nur aktive Datensätze) ab.
 * - Grundstück: ersetzt die Grenze des vorhandenen Grundstücks (gleiche ID), sonst neu.
 * - Bäume: Nummern, die es schon gibt, werden übersprungen.
 * - Sorten: Zuordnung über den Namen (ohne Groß-/Kleinschreibung); fehlende werden angelegt.
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

  let grundstueck: ImportPlan['grundstueck'] = null;
  if (gelesen.grundstueck) {
    grundstueck = {
      ersetzt: vorhandenesGrundstueck !== null,
      datensatz: {
        id: vorhandenesGrundstueck?.id ?? neueId(),
        name: gelesen.grundstueck.name,
        polygon: gelesen.grundstueck.polygon,
        aktualisiert_am: zeit,
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
    const neu: Sorte = { id: neueId(), name, ringfarbe: NEUE_SORTE_FARBE, aktualisiert_am: zeit, geloescht: false };
    sorten.push(neu);
    neueSorten.push(neu);
    return neu.id;
  };

  const vorhandeneNummern = new Set(bestand.baeume.map((b) => b.nummer));
  const uebersprungen = [...gelesen.uebersprungen];
  const baeume: Baum[] = [];
  for (const b of gelesen.baeume) {
    if (vorhandeneNummern.has(b.nummer)) {
      uebersprungen.push({ nr: b.nr, nummer: b.nummer, grund: 'nummer_vorhanden' });
      continue;
    }
    baeume.push({
      id: neueId(),
      nummer: b.nummer,
      grundstueck_id: grundstueckId,
      sorte_id: b.sorte ? sorteFuer(b.sorte) : null,
      lat: b.lat,
      lon: b.lon,
      gps_genauigkeit_m: b.gps_genauigkeit_m,
      hoehe_m: b.hoehe_m,
      notiz: b.notiz,
      aktualisiert_am: zeit,
      geloescht: false,
    });
  }
  uebersprungen.sort((a, b) => a.nr - b.nr);

  return { grundstueck, baeume, neueSorten, uebersprungen };
}
