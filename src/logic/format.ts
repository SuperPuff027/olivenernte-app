import type { Sprache } from './sprache';

const KOORDINATEN_STELLEN = 6;

export function formatiereZahl(wert: number, sprache: Sprache, nachkommastellen = 0): string {
  return new Intl.NumberFormat(sprache, {
    minimumFractionDigits: nachkommastellen,
    maximumFractionDigits: nachkommastellen,
  }).format(wert);
}

export function formatiereKg(wert: number, sprache: Sprache): string {
  return new Intl.NumberFormat(sprache, {
    style: 'unit',
    unit: 'kilogram',
    maximumFractionDigits: 1,
  }).format(wert);
}

export function formatiereMeter(wert: number, sprache: Sprache): string {
  return new Intl.NumberFormat(sprache, {
    style: 'unit',
    unit: 'meter',
    maximumFractionDigits: 1,
  }).format(wert);
}

/** Dezimalgrad mit fester Stellenzahl, ohne Tausendertrennzeichen. */
export function formatiereGrad(wert: number, sprache: Sprache): string {
  return new Intl.NumberFormat(sprache, {
    minimumFractionDigits: KOORDINATEN_STELLEN,
    maximumFractionDigits: KOORDINATEN_STELLEN,
    useGrouping: false,
  }).format(wert);
}

/** ISO-Zeitpunkt als Datum mit Uhrzeit. */
export function formatiereZeitpunkt(iso: string, sprache: Sprache, zeitzone?: string): string {
  return new Intl.DateTimeFormat(sprache, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zeitzone,
  }).format(new Date(iso));
}

/** ISO-Datum (JJJJ-MM-TT) ohne Uhrzeit. */
export function formatiereDatum(iso: string, sprache: Sprache): string {
  return new Intl.DateTimeFormat(sprache, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(iso),
  );
}
