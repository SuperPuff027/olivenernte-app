import type { Schluessel, Uebersetzer } from '../i18n';
import type { BaumFilter } from '../logic/filter';

// Kleine Textbausteine, die mehrere Oberflächenteile brauchen.

// Fehlercodes der Geolocation-API
const ZUGRIFF_VERWEIGERT = 1;
const ZEITUEBERSCHREITUNG = 3;

export function standortFehlerText(code: number): Schluessel {
  switch (code) {
    case ZUGRIFF_VERWEIGERT:
      return 'standort.fehler.verweigert';
    case ZEITUEBERSCHREITUNG:
      return 'standort.fehler.zeitueberschreitung';
    default:
      return 'standort.fehler.nicht_verfuegbar';
  }
}

/** Kurzbeschreibung eines aktiven Filters, z. B. „Memecik · Bereit · Füllstand 3–5“. */
export function filterBeschreibung(filter: BaumFilter, sorteName: string | null, t: Uebersetzer): string {
  const { sorte, status, fuellstand } = filter;
  return [
    sorte ? (sorteName ?? t('sorten.ohne_sorte')) : null,
    status ? t(`status.${status}`) : null,
    fuellstand === null
      ? null
      : fuellstand.von === fuellstand.bis
        ? t('filter.fuellstand_einzeln', { wert: fuellstand.von })
        : t('filter.fuellstand_bereich', { von: fuellstand.von, bis: fuellstand.bis }),
  ]
    .filter((teil): teil is string => teil !== null)
    .join(' · ');
}
