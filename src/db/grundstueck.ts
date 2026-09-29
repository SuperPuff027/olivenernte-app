import { geaendert, neueId } from '../logic/datensatz';
import type { GeoJsonPolygon, Grundstueck } from '../model/typen';
import { db } from './datenbank';

/** Das (einzige) aktive Grundstück oder null. */
export async function ladeGrundstueck(): Promise<Grundstueck | null> {
  const alle = await db.grundstuecke.toArray();
  return alle.find((g) => !g.geloescht) ?? null;
}

/**
 * Speichert die Grenze. Ohne vorhandenes Grundstück wird eines angelegt und
 * Bäume ohne Grundstück werden ihm zugeordnet.
 */
export async function speichereGrundstueck(
  polygon: GeoJsonPolygon,
  vorhanden: Grundstueck | null,
  nameFuerNeues: string,
): Promise<Grundstueck> {
  return db.transaction('rw', db.grundstuecke, db.baeume, async () => {
    const jetzt = new Date();
    if (vorhanden) {
      const neu = geaendert({ ...vorhanden, polygon }, jetzt);
      await db.grundstuecke.put(neu);
      return neu;
    }
    const neu: Grundstueck = {
      id: neueId(),
      name: nameFuerNeues,
      polygon,
      aktualisiert_am: jetzt.toISOString(),
      geloescht: false,
    };
    await db.grundstuecke.put(neu);
    const ohneGrundstueck = (await db.baeume.toArray()).filter((b) => !b.geloescht && b.grundstueck_id === null);
    await db.baeume.bulkPut(ohneGrundstueck.map((b) => geaendert({ ...b, grundstueck_id: neu.id }, jetzt)));
    return neu;
  });
}
