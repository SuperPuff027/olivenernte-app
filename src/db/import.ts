import type { Bestand, ImportPlan } from '../logic/importGeojson';
import { db } from './datenbank';
import { ladeAktive } from './repo';

export async function ladeBestand(): Promise<Bestand> {
  const [grundstuecke, baeume, sorten] = await Promise.all([
    ladeAktive(db.grundstuecke),
    ladeAktive(db.baeume),
    ladeAktive(db.sorten),
  ]);
  return { grundstuecke, baeume, sorten };
}

/** Schreibt einen Import-Plan in einer Transaktion: alles oder nichts. */
export async function fuehreImportAus(plan: ImportPlan): Promise<void> {
  await db.transaction('rw', [db.grundstuecke, db.sorten, db.baeume, db.saison_status], async () => {
    if (plan.grundstueck) await db.grundstuecke.put(plan.grundstueck.datensatz);
    await db.sorten.bulkPut(plan.neueSorten);
    await db.baeume.bulkPut(plan.baeume);
    await db.saison_status.bulkPut(plan.saisonStatus);
  });
}
