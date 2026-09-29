import type { ExportDaten } from '../logic/exportGeojson';
import { db } from './datenbank';
import { ladeAktive } from './repo';

/** Alle aktiven Daten für den Export, inkl. Saisonstatus aller Jahre. */
export async function ladeExportDaten(): Promise<ExportDaten> {
  const [grundstuecke, baeume, sorten, saisonStatus] = await Promise.all([
    ladeAktive(db.grundstuecke),
    ladeAktive(db.baeume),
    ladeAktive(db.sorten),
    db.saison_status.toArray().then((alle) => alle.filter((s) => !s.geloescht)),
  ]);
  return { grundstuecke, baeume, sorten, saisonStatus };
}
