import type { Table } from 'dexie';
import {
  alsGeloescht,
  geaendert,
  neuerSaisonStatus,
  nurAktive,
  standardEinstellungen,
} from '../logic/datensatz';
import { EINSTELLUNGEN_ID, type Einstellungen, type MitId, type SaisonStatus } from '../model/typen';
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
  Pick<Einstellungen, 'fuellstand_max' | 'ziel_gps_genauigkeit_m' | 'sprache'>
>;

export async function aendereEinstellungen(aenderung: EinstellungsAenderung): Promise<Einstellungen> {
  return db.transaction('rw', db.einstellungen, async () => {
    const neu = geaendert({ ...(await ladeEinstellungen()), ...aenderung }, new Date());
    await db.einstellungen.put(neu);
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
