import type { Baum, Grundstueck, Position, SaisonStatus } from '../model/typen';
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

/**
 * Knöpfe für den Füllstand: 1 … max. Ein gespeicherter Wert über max (max wurde später
 * verkleinert) bleibt als eigener Knopf sichtbar, damit er nicht stillschweigend verschwindet.
 */
export function fuellstandOptionen(max: number, aktuell: number | null): number[] {
  const obergrenze = Math.max(1, Math.floor(max));
  const optionen = Array.from({ length: obergrenze }, (_, i) => i + 1);
  if (aktuell !== null && Number.isInteger(aktuell) && aktuell > obergrenze) optionen.push(aktuell);
  return optionen;
}

/** Jüngster Änderungszeitpunkt von Baum und Saisonstatus (ISO). */
export function letzteAenderung(baum: Baum, status: SaisonStatus | null): string {
  if (!status || status.geloescht) return baum.aktualisiert_am;
  return Date.parse(status.aktualisiert_am) > Date.parse(baum.aktualisiert_am) ? status.aktualisiert_am : baum.aktualisiert_am;
}

/**
 * Baum an eine von Hand gewählte Position verschieben. Die GPS-Genauigkeit gilt danach
 * nicht mehr (null = von Hand gesetzt); die Höhe bleibt, bei wenigen Metern Versatz ändert sie sich kaum.
 */
export function verschobenerBaum(baum: Baum, punkt: Position, grundstueck: Grundstueck | null, jetzt: Date): NeuerBaum {
  const aktivesGrundstueck = grundstueck && !grundstueck.geloescht ? grundstueck : null;
  return {
    baum: {
      ...baum,
      lat: punkt[1],
      lon: punkt[0],
      gps_genauigkeit_m: null,
      aktualisiert_am: jetzt.toISOString(),
    },
    ausserhalb: aktivesGrundstueck !== null && !liegtImPolygon(punkt, aktivesGrundstueck.polygon),
  };
}
