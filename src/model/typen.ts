import type { Sprache } from '../logic/sprache';

/** Felder, die jeder synchronisierbare Datensatz hat. */
export interface Synchronisierbar {
  /** ISO-Zeitpunkt der letzten Änderung. */
  aktualisiert_am: string;
  /** Soft-Delete: gelöschte Datensätze bleiben für die Synchronisation erhalten. */
  geloescht: boolean;
}

export interface MitId extends Synchronisierbar {
  /** UUID */
  id: string;
}

/** GeoJSON-Position: [lon, lat] oder [lon, lat, höhe]. */
export type Position = [number, number] | [number, number, number];

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface Grundstueck extends MitId {
  name: string;
  polygon: GeoJsonPolygon;
}

export interface Sorte extends MitId {
  name: string;
  /** Hex-Farbe, z. B. "#1e88e5" */
  ringfarbe: string;
}

export interface Baum extends MitId {
  /** Kurze sichtbare Nummer, z. B. "B-17" */
  nummer: string;
  /** null, solange noch kein Grundstück angelegt ist. */
  grundstueck_id: string | null;
  /** null = ohne Sorte */
  sorte_id: string | null;
  lat: number;
  lon: number;
  /** null bei manueller Position (Tipp, Drag) oder Import ohne Angabe. */
  gps_genauigkeit_m: number | null;
  /** Höhe über Meer; Vorbereitung für 3D-Terrain. */
  hoehe_m: number | null;
  notiz: string;
}

export const ERNTE_STATUS = ['nicht_bereit', 'bereit', 'geerntet'] as const;
export type ErnteStatus = (typeof ERNTE_STATUS)[number];

/** Status eines Baums in einer Saison. Schlüssel: [baum_id, jahr]. */
export interface SaisonStatus extends Synchronisierbar {
  baum_id: string;
  jahr: number;
  status: ErnteStatus;
  /** 1 … fuellstand_max, vor der Ernte geschätzt; null = nicht geschätzt. */
  fuellstand: number | null;
  ertrag_kg: number | null;
  /** ISO-Datum JJJJ-MM-TT */
  erntedatum: string | null;
}

export const EINSTELLUNGEN_ID = 'einstellungen';

/** Einstellungen dieses Geräts; werden nicht abgeglichen. */
export interface Einstellungen extends Synchronisierbar {
  id: typeof EINSTELLUNGEN_ID;
  ziel_gps_genauigkeit_m: number;
  /** null = Gerätesprache verwenden */
  sprache: Sprache | null;
}

export const HAIN_ID = 'hain';

/** Einstellungen, die für alle Geräte des Hains gelten und abgeglichen werden (ein Datensatz). */
export interface HainEinstellungen extends Synchronisierbar {
  id: typeof HAIN_ID;
  /** Saison, in die Status, Füllstand und Ertrag geschrieben werden (Jahr des Erntebeginns) */
  aktuelle_saison: number;
  fuellstand_max: number;
}

/** Ab Phase 4 (Bewässerung); in Phase 1 nur im Schema. */
export interface Sensor extends MitId {
  lat: number;
  lon: number;
  messwerte: { zeitstempel: string; wert: number }[];
}

/** Vom Server zuletzt bestätigte Fassung eines Datensatzes (nur auf dem Gerät). */
export interface SyncStand {
  tabelle: string;
  schluessel: string;
  aktualisiert_am: string;
}

export const SYNC_META_ID = 'sync';

/** Stand des Abgleichs auf diesem Gerät. */
export interface SyncMeta {
  id: typeof SYNC_META_ID;
  /** Server-Revision, bis zu der das Gerät alles kennt */
  rev: number;
  /** ISO-Zeit des letzten erfolgreichen Abgleichs */
  letzter_abgleich: string | null;
}
