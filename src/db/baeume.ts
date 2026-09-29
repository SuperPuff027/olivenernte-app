import { neuerBaum, verschobenerBaum, type NeuerBaum } from '../logic/baum';
import { geaendert, neueId } from '../logic/datensatz';
import { normiereNummer, pruefeNummer, type NummernFehler } from '../logic/nummern';
import type { Sprache } from '../logic/sprache';
import type { Baum, Position } from '../model/typen';
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

export type BaumAenderung = Partial<Pick<Baum, 'nummer' | 'sorte_id' | 'notiz'>>;

export type BaumAenderungsErgebnis =
  | { ok: true; baum: Baum }
  | { ok: false; fehler: NummernFehler | 'nicht_gefunden' };

/**
 * Ändert Nummer, Sorte oder Notiz. Eine neue Nummer wird vereinheitlicht und in derselben
 * Transaktion gegen alle aktiven Bäume geprüft; ist sie ungültig, wird nichts gespeichert.
 */
export async function aendereBaum(id: string, aenderung: BaumAenderung, sprache: Sprache): Promise<BaumAenderungsErgebnis> {
  return db.transaction('rw', db.baeume, async () => {
    const vorhanden = await db.baeume.get(id);
    if (!vorhanden || vorhanden.geloescht) return { ok: false, fehler: 'nicht_gefunden' };
    const neu = { ...vorhanden, ...aenderung };
    if (aenderung.nummer !== undefined) {
      const fehler = pruefeNummer(aenderung.nummer, await ladeAktive(db.baeume), sprache, id);
      if (fehler) return { ok: false, fehler };
      neu.nummer = normiereNummer(aenderung.nummer);
    }
    const gespeichert = geaendert(neu, new Date());
    await db.baeume.put(gespeichert);
    return { ok: true, baum: gespeichert };
  });
}

/** Ein aktiver Baum oder null. */
export async function ladeBaum(id: string): Promise<Baum | null> {
  const baum = await db.baeume.get(id);
  return baum && !baum.geloescht ? baum : null;
}

/** Neue Position von Hand (Drag); null, wenn der Baum nicht (mehr) existiert. */
export async function verschiebeBaum(id: string, punkt: Position): Promise<NeuerBaum | null> {
  return db.transaction('rw', db.baeume, db.grundstuecke, async () => {
    const vorhanden = await db.baeume.get(id);
    if (!vorhanden || vorhanden.geloescht) return null;
    const neu = verschobenerBaum(vorhanden, punkt, await ladeGrundstueck(), new Date());
    await db.baeume.put(neu.baum);
    return neu;
  });
}
