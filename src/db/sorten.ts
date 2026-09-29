import { alsGeloescht, geaendert, neueId } from '../logic/datensatz';
import type { Sorte } from '../model/typen';
import { db } from './datenbank';
import { ladeAktive } from './repo';

export function ladeSorten(): Promise<Sorte[]> {
  return ladeAktive(db.sorten);
}

export async function legeSorteAn(name: string, ringfarbe: string): Promise<Sorte> {
  const sorte: Sorte = {
    id: neueId(),
    name: name.trim(),
    ringfarbe,
    aktualisiert_am: new Date().toISOString(),
    geloescht: false,
  };
  await db.sorten.put(sorte);
  return sorte;
}

export async function aendereSorte(
  id: string,
  aenderung: Partial<Pick<Sorte, 'name' | 'ringfarbe'>>,
): Promise<Sorte | null> {
  return db.transaction('rw', db.sorten, async () => {
    const vorhanden = await db.sorten.get(id);
    if (!vorhanden || vorhanden.geloescht) return null;
    const neu = geaendert(
      { ...vorhanden, ...aenderung, name: (aenderung.name ?? vorhanden.name).trim() },
      new Date(),
    );
    await db.sorten.put(neu);
    return neu;
  });
}

/**
 * Löscht eine Sorte weich. Bäume mit dieser Sorte bekommen umhaengenAuf
 * (andere Sorte oder null = ohne Sorte).
 */
export async function loescheSorte(id: string, umhaengenAuf: string | null): Promise<void> {
  await db.transaction('rw', db.sorten, db.baeume, async () => {
    const jetzt = new Date();
    const betroffen = await db.baeume.where('sorte_id').equals(id).toArray();
    await db.baeume.bulkPut(
      betroffen.filter((b) => !b.geloescht).map((b) => geaendert({ ...b, sorte_id: umhaengenAuf }, jetzt)),
    );
    const sorte = await db.sorten.get(id);
    if (sorte && !sorte.geloescht) await db.sorten.put(alsGeloescht(sorte, jetzt));
  });
}
