import {
  EINSTELLUNGEN_ID,
  HAIN_ID,
  type Einstellungen,
  type HainEinstellungen,
  type ErnteStatus,
  type SaisonStatus,
  type Synchronisierbar,
} from '../model/typen';

/** Status ohne Eintrag für die Saison und Status eines neu angelegten Saisonstatus */
export const STANDARD_STATUS: ErnteStatus = 'nicht_bereit';

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

/**
 * Monat (1–12), ab dem die App die Saison des laufenden Jahres vorschlägt. Die Ernte läuft bis in
 * Januar/Februar; erst danach wachsen die Früchte der nächsten Saison.
 */
export const SAISON_VORSCHLAG_AB_MONAT = 5;

/**
 * Vorgeschlagene Saison (= Jahr des Erntebeginns) zu einem Zeitpunkt: ab Mai das laufende Jahr,
 * davor das Vorjahr. Die tatsächlich aktuelle Saison steht in den Hain-Einstellungen.
 */
export function saisonJahr(jetzt: Date): number {
  const jahr = jetzt.getFullYear();
  return jetzt.getMonth() + 1 >= SAISON_VORSCHLAG_AB_MONAT ? jahr : jahr - 1;
}

/** Soll die App vorschlagen, eine neue Saison zu beginnen? */
export function saisonwechselFaellig(aktuelleSaison: number, jetzt: Date): boolean {
  return saisonJahr(jetzt) > aktuelleSaison;
}

export function standardEinstellungen(jetzt: Date): Einstellungen {
  return {
    id: EINSTELLUNGEN_ID,
    ziel_gps_genauigkeit_m: STANDARD_ZIEL_GPS_GENAUIGKEIT_M,
    sprache: null,
    aktualisiert_am: jetzt.toISOString(),
    geloescht: false,
  };
}

export function standardHainEinstellungen(jetzt: Date): HainEinstellungen {
  return {
    id: HAIN_ID,
    aktuelle_saison: saisonJahr(jetzt),
    fuellstand_max: STANDARD_FUELLSTAND_MAX,
    aktualisiert_am: jetzt.toISOString(),
    geloescht: false,
  };
}

/**
 * Migration v1 → v2: `fuellstand_max` stand bisher in den Geräte-Einstellungen und zieht in die
 * Hain-Einstellungen um. Ungültige oder fehlende Werte ergeben den Standard; Saison = laufendes Jahr.
 */
export function hainAusAltenEinstellungen(alt: unknown, jetzt: Date): HainEinstellungen {
  const hain = standardHainEinstellungen(jetzt);
  if (typeof alt !== 'object' || alt === null) return hain;
  const wert = (alt as Record<string, unknown>).fuellstand_max;
  return typeof wert === 'number' && Number.isInteger(wert) && wert >= 1 ? { ...hain, fuellstand_max: wert } : hain;
}

export function neuerSaisonStatus(baum_id: string, jahr: number, jetzt: Date): SaisonStatus {
  return {
    baum_id,
    jahr,
    status: STANDARD_STATUS,
    fuellstand: null,
    ertrag_kg: null,
    erntedatum: null,
    aktualisiert_am: jetzt.toISOString(),
    geloescht: false,
  };
}

/** Wählbare Saisons: alle mit Daten plus die aktuelle, neueste zuerst, ohne Doppelte. */
export function saisonAuswahl(jahreMitDaten: readonly number[], aktuelleSaison: number): number[] {
  return [...new Set([...jahreMitDaten.filter(Number.isInteger), aktuelleSaison])].sort((a, b) => b - a);
}
