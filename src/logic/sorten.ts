import type { Baum, Sorte } from '../model/typen';
import type { Sprache } from './sprache';
import { vergleiche } from './text';

/**
 * Farbpalette für die Ringfarbe: kräftig, gut unterscheidbar, auch auf Luftbildern sichtbar.
 * Bewusst ohne Grün, Rot und Grau (Statusfarben der Punktfüllung) und ohne Weiß („ohne Sorte“).
 * Die Reihenfolge ist auch die Vorschlagsreihenfolge für neue Sorten.
 */
export const RINGFARBEN_VORSCHLAG = [
  '#1e88e5', // blau
  '#ff00ff', // magenta
  '#7e57c2', // lila
  '#795548', // braun
  '#ffd600', // gelb
  '#ff6d00', // orange
  '#00e5ff', // türkis
  '#ff80ab', // rosa
  '#1a237e', // dunkelblau
  '#000000', // schwarz
] as const;

export type Ringfarbe = (typeof RINGFARBEN_VORSCHLAG)[number];
export type FarbName = 'blau' | 'magenta' | 'lila' | 'braun' | 'gelb' | 'orange' | 'tuerkis' | 'rosa' | 'dunkelblau' | 'schwarz';

/** Name jeder Palettenfarbe (für Beschriftung und Screenreader). */
export const FARB_NAMEN: Readonly<Record<Ringfarbe, FarbName>> = {
  '#1e88e5': 'blau',
  '#ff00ff': 'magenta',
  '#7e57c2': 'lila',
  '#795548': 'braun',
  '#ffd600': 'gelb',
  '#ff6d00': 'orange',
  '#00e5ff': 'tuerkis',
  '#ff80ab': 'rosa',
  '#1a237e': 'dunkelblau',
  '#000000': 'schwarz',
};

/** Name einer Farbe, falls sie aus der Palette stammt (ohne Groß-/Kleinschreibung). */
export function farbName(farbe: string): FarbName | null {
  const treffer = RINGFARBEN_VORSCHLAG.find((f) => f === farbe.toLowerCase());
  return treffer ? FARB_NAMEN[treffer] : null;
}

export type NamensFehler = 'leer' | 'doppelt';

export function sortiereSorten(sorten: readonly Sorte[], sprache: Sprache): Sorte[] {
  return [...sorten].sort((a, b) => vergleiche(a.name, b.name, sprache));
}

/** Prüft einen Sortennamen; eigeneId schließt die gerade umbenannte Sorte aus. */
export function pruefeSortenname(
  name: string,
  sorten: readonly Sorte[],
  sprache: Sprache,
  eigeneId: string | null = null,
): NamensFehler | null {
  const bereinigt = name.trim();
  if (bereinigt === '') return 'leer';
  const doppelt = sorten.some((s) => s.id !== eigeneId && !s.geloescht && vergleiche(s.name, bereinigt, sprache) === 0);
  return doppelt ? 'doppelt' : null;
}

export function istHexFarbe(wert: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(wert);
}

/** Erste Vorschlagsfarbe, die noch keine aktive Sorte hat; sonst reihum. */
export function naechsteRingfarbe(sorten: readonly Sorte[]): string {
  const aktiv = sorten.filter((s) => !s.geloescht);
  const belegt = new Set(aktiv.map((s) => s.ringfarbe.toLowerCase()));
  const frei = RINGFARBEN_VORSCHLAG.find((f) => !belegt.has(f));
  return frei ?? RINGFARBEN_VORSCHLAG[aktiv.length % RINGFARBEN_VORSCHLAG.length]!;
}

export function zaehleBaeumeMitSorte(baeume: readonly Baum[], sorteId: string): number {
  return baeume.filter((b) => !b.geloescht && b.sorte_id === sorteId).length;
}

/** Löschen ohne Rückfrage nur, wenn kein Baum die Sorte hat. */
export type LoeschPruefung = { art: 'direkt' } | { art: 'rueckfrage'; anzahlBaeume: number };

export function pruefeLoeschen(baeume: readonly Baum[], sorteId: string): LoeschPruefung {
  const anzahl = zaehleBaeumeMitSorte(baeume, sorteId);
  return anzahl === 0 ? { art: 'direkt' } : { art: 'rueckfrage', anzahlBaeume: anzahl };
}
