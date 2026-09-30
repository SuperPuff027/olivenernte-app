import type { Table } from 'dexie';
import {
  alsGeloescht,
  geaendert,
  neuerSaisonStatus,
  nurAktive,
  standardEinstellungen,
  standardHainEinstellungen,
} from '../logic/datensatz';
import { ernteAenderung } from '../logic/ernte';
import {
  EINSTELLUNGEN_ID,
  HAIN_ID,
  type Einstellungen,
  type HainEinstellungen,
  type MitId,
  type SaisonStatus,
} from '../model/typen';
import { db } from './datenbank';

// Alle Schreibzugriffe laufen über diese Funktionen, damit aktualisiert_am
// immer gesetzt wird und nie hart gelöscht wird.

export async function ladeAktive<T extends MitId>(tabelle: Table<T, string>): Promise<T[]> {
  return nurAktive(await tabelle.toArray());
}

export async function speichere<T extends MitId>(tabelle: Table<T, string>, datensatz: T): Promise<T> {
  const neu = geaendert(datensatz, new Date());
  await tabelle.put(neu);
  return neu;
}

export async function loescheWeich<T extends MitId>(tabelle: Table<T, string>, id: string): Promise<void> {
  await db.transaction('rw', tabelle, async () => {
    const vorhanden = await tabelle.get(id);
    if (vorhanden && !vorhanden.geloescht) await tabelle.put(alsGeloescht(vorhanden, new Date()));
  });
}

export async function ladeEinstellungen(): Promise<Einstellungen> {
  return (await db.einstellungen.get(EINSTELLUNGEN_ID)) ?? standardEinstellungen(new Date());
}

export type EinstellungsAenderung = Partial<
  Pick<Einstellungen, 'ziel_gps_genauigkeit_m' | 'sprache'>
>;

export async function aendereEinstellungen(aenderung: EinstellungsAenderung): Promise<Einstellungen> {
  return db.transaction('rw', db.einstellungen, async () => {
    const neu = geaendert({ ...(await ladeEinstellungen()), ...aenderung }, new Date());
    await db.einstellungen.put(neu);
    return neu;
  });
}

/** Hain-weite Einstellungen; ohne Datensatz die Standardwerte (aktuelle Saison = laufendes Jahr). */
export async function ladeHain(): Promise<HainEinstellungen> {
  const hain = await db.hain.get(HAIN_ID);
  return hain && !hain.geloescht ? hain : standardHainEinstellungen(new Date());
}

export type HainAenderung = Partial<Pick<HainEinstellungen, 'aktuelle_saison' | 'fuellstand_max'>>;

export async function aendereHain(aenderung: HainAenderung): Promise<HainEinstellungen> {
  return db.transaction('rw', db.hain, async () => {
    const neu = geaendert({ ...(await ladeHain()), ...aenderung }, new Date());
    await db.hain.put(neu);
    return neu;
  });
}

export async function ladeSaisonStatus(baum_id: string, jahr: number): Promise<SaisonStatus | null> {
  const status = await db.saison_status.get([baum_id, jahr]);
  return status && !status.geloescht ? status : null;
}

export type SaisonAenderung = Partial<
  Pick<SaisonStatus, 'status' | 'fuellstand' | 'ertrag_kg' | 'erntedatum'>
>;

/** Ändert den Saisonstatus; legt ihn an, falls es für das Jahr noch keinen gibt. */
export async function aendereSaisonStatus(
  baum_id: string,
  jahr: number,
  aenderung: SaisonAenderung,
): Promise<SaisonStatus> {
  return db.transaction('rw', db.saison_status, async () => {
    const jetzt = new Date();
    const basis = (await ladeSaisonStatus(baum_id, jahr)) ?? neuerSaisonStatus(baum_id, jahr, jetzt);
    const neu = geaendert({ ...basis, ...aenderung }, jetzt);
    await db.saison_status.put(neu);
    return neu;
  });
}

/** Alle aktiven Saisonstatus eines Jahres (für die Kartenfarben). */
export async function ladeSaisonStatusJahr(jahr: number): Promise<SaisonStatus[]> {
  return nurAktive(await db.saison_status.where('jahr').equals(jahr).toArray());
}

/**
 * Baum als geerntet markieren (kg = null: ohne Menge). Erntedatum heute, bei schon geerntetem
 * Baum bleibt das ursprüngliche Datum. Lesen und Schreiben in einer Transaktion.
 */
export async function markiereGeerntet(baum_id: string, jahr: number, kg: number | null): Promise<SaisonStatus> {
  return db.transaction('rw', db.saison_status, async () => {
    const jetzt = new Date();
    const vorher = await ladeSaisonStatus(baum_id, jahr);
    return aendereSaisonStatus(baum_id, jahr, ernteAenderung(vorher, kg, jetzt));
  });
}

/** Jahre, zu denen es aktive Saisonstatus gibt (unsortiert, ohne Doppelte). */
export async function ladeSaisonJahre(): Promise<number[]> {
  const jahre = new Set<number>();
  await db.saison_status.each((s) => {
    if (!s.geloescht) jahre.add(s.jahr);
  });
  return [...jahre];
}

/** Alle aktiven Saisonstatus eines Baums (für den Verlauf im Panel). */
export async function ladeSaisonStatusBaum(baum_id: string): Promise<SaisonStatus[]> {
  return nurAktive(await db.saison_status.where('baum_id').equals(baum_id).toArray());
}
