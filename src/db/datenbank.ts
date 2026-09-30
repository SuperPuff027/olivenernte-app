import Dexie, { type Table } from 'dexie';
import { hainAusAltenEinstellungen } from '../logic/datensatz';
import {
  EINSTELLUNGEN_ID,
  type Baum,
  type Einstellungen,
  type Grundstueck,
  type HainEinstellungen,
  type SaisonStatus,
  type Sensor,
  type Sorte,
} from '../model/typen';

export class OlivenDatenbank extends Dexie {
  grundstuecke!: Table<Grundstueck, string>;
  sorten!: Table<Sorte, string>;
  baeume!: Table<Baum, string>;
  saison_status!: Table<SaisonStatus, [string, number]>;
  einstellungen!: Table<Einstellungen, string>;
  /** Hain-weite Einstellungen (ein Datensatz, wird abgeglichen) */
  hain!: Table<HainEinstellungen, string>;
  /** Ab Phase 4; bis dahin ungenutzt. */
  sensoren!: Table<Sensor, string>;

  constructor(name = 'olivenernte') {
    super(name);
    // Nur indizierte Felder angeben. Schemaänderungen immer als neue Version anhängen.
    this.version(1).stores({
      grundstuecke: 'id',
      sorten: 'id',
      baeume: 'id, grundstueck_id, sorte_id, nummer',
      saison_status: '[baum_id+jahr], baum_id, jahr',
      einstellungen: 'id',
      sensoren: 'id',
    });
    // v2: Hain-Einstellungen (aktuelle Saison, fuellstand_max) für den Abgleich zwischen Geräten.
    this.version(2)
      .stores({ hain: 'id' })
      .upgrade(async (tx) => {
        const einstellungen = tx.table('einstellungen');
        const alt: unknown = await einstellungen.get(EINSTELLUNGEN_ID);
        await tx.table('hain').put(hainAusAltenEinstellungen(alt, new Date()));
        await einstellungen.toCollection().modify((e: Record<string, unknown>) => {
          delete e.fuellstand_max;
        });
      });
  }
}

export const db = new OlivenDatenbank();
