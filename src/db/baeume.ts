import { neuerBaum, type NeuerBaum } from '../logic/baum';
import { neueId } from '../logic/datensatz';
import type { Position } from '../model/typen';
import { db } from './datenbank';
import { ladeGrundstueck } from './grundstueck';
import { ladeAktive, loescheWeich } from './repo';

/**
 * Legt einen Baum an der Position an. Nummer und Speichern in einer Transaktion,
 * damit schnelle Tipps hintereinander keine Nummer doppelt vergeben.
 */
export async function legeBaumAn(punkt: Position, gps_genauigkeit_m: number | null = null): Promise<NeuerBaum> {
  return db.transaction('rw', db.baeume, db.grundstuecke, async () => {
    const neu = neuerBaum(
      punkt,
      await ladeAktive(db.baeume),
      await ladeGrundstueck(),
      gps_genauigkeit_m,
      new Date(),
      neueId(),
    );
    await db.baeume.put(neu.baum);
    return neu;
  });
}

export function loescheBaum(id: string): Promise<void> {
  return loescheWeich(db.baeume, id);
}
