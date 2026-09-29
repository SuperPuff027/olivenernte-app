import {
  EINSTELLUNGEN_ID,
  type Einstellungen,
  type SaisonStatus,
  type Synchronisierbar,
} from '../model/typen';

export const STANDARD_FUELLSTAND_MAX = 5;
export const STANDARD_ZIEL_GPS_GENAUIGKEIT_M = 5;

export function neueId(): string {
  return crypto.randomUUID();
}

/** Setzt aktualisiert_am auf den Zeitpunkt der Änderung. */
export function geaendert<T extends Synchronisierbar>(datensatz: T, jetzt: Date): T {
  return { ...datensatz, aktualisiert_am: jetzt.toISOString() };
}

export function alsGeloescht<T extends Synchronisierbar>(datensatz: T, jetzt: Date): T {
  return { ...datensatz, geloescht: true, aktualisiert_am: jetzt.toISOString() };
}

export function nurAktive<T extends Synchronisierbar>(datensaetze: readonly T[]): T[] {
  return datensaetze.filter((d) => !d.geloescht);
}

/** Saison = Kalenderjahr (Saisonwechsel folgt in einer späteren Phase). */
export function saisonJahr(jetzt: Date): number {
  return jetzt.getFullYear();
}

export function standardEinstellungen(jetzt: Date): Einstellungen {
  return {
    id: EINSTELLUNGEN_ID,
    fuellstand_max: STANDARD_FUELLSTAND_MAX,
    ziel_gps_genauigkeit_m: STANDARD_ZIEL_GPS_GENAUIGKEIT_M,
    sprache: null,
    aktualisiert_am: jetzt.toISOString(),
    geloescht: false,
  };
}

export function neuerSaisonStatus(baum_id: string, jahr: number, jetzt: Date): SaisonStatus {
  return {
    baum_id,
    jahr,
    status: 'nicht_bereit',
    fuellstand: null,
    ertrag_kg: null,
    erntedatum: null,
    aktualisiert_am: jetzt.toISOString(),
    geloescht: false,
  };
}
