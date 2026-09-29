import Dexie, { type Table } from 'dexie';
import type {
  Baum,
  Einstellungen,
  Grundstueck,
  SaisonStatus,
  Sensor,
  Sorte,
} from '../model/typen';

export class OlivenDatenbank extends Dexie {
  grundstuecke!: Table<Grundstueck, string>;
  sorten!: Table<Sorte, string>;
  baeume!: Table<Baum, string>;
  saison_status!: Table<SaisonStatus, [string, number]>;
  einstellungen!: Table<Einstellungen, string>;
  /** Ab Phase 4; bis dahin ungenutzt. */
  sensoren!: Table<Sensor, string>;

  constructor() {
    super('olivenernte');
    // Nur indizierte Felder angeben. Schemaänderungen immer als neue Version anhängen.
    this.version(1).stores({
      grundstuecke: 'id',
      sorten: 'id',
      baeume: 'id, grundstueck_id, sorte_id, nummer',
      saison_status: '[baum_id+jahr], baum_id, jahr',
      einstellungen: 'id',
      sensoren: 'id',
    });
  }
}

export const db = new OlivenDatenbank();
