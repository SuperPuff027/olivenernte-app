import type { Baum, Grundstueck, Position } from '../model/typen';
import { naechsteNummer } from './nummern';
import { liegtImPolygon } from './polygon';

export interface NeuerBaum {
  baum: Baum;
  /** Liegt außerhalb der Grundstücksgrenze (wird trotzdem gespeichert, nur Hinweis). */
  ausserhalb: boolean;
}

/**
 * Neuer Baum an einer Position mit der nächsten freien Nummer.
 * Er gehört zum (einzigen) Grundstück, auch wenn er außerhalb der Grenze liegt.
 */
export function neuerBaum(
  punkt: Position,
  baeume: readonly Baum[],
  grundstueck: Grundstueck | null,
  gps_genauigkeit_m: number | null,
  jetzt: Date,
  id: string,
): NeuerBaum {
  const aktivesGrundstueck = grundstueck && !grundstueck.geloescht ? grundstueck : null;
  return {
    baum: {
      id,
      nummer: naechsteNummer(baeume),
      grundstueck_id: aktivesGrundstueck?.id ?? null,
      sorte_id: null,
      lat: punkt[1],
      lon: punkt[0],
      gps_genauigkeit_m,
      hoehe_m: punkt[2] ?? null,
      notiz: '',
      aktualisiert_am: jetzt.toISOString(),
      geloescht: false,
    },
    ausserhalb: aktivesGrundstueck !== null && !liegtImPolygon(punkt, aktivesGrundstueck.polygon),
  };
}
