import type { Baum, Sorte } from '../model/typen';
import type { Sprache } from './sprache';
import { vergleiche } from './text';

/**
 * Vorschläge für die Ringfarbe neuer Sorten: kräftig, gut unterscheidbar, auch auf
 * Luftbildern sichtbar. Weiß ist für „ohne Sorte“ reserviert. Der Nutzer kann jede Farbe wählen.
 */
export const RINGFARBEN_VORSCHLAG = [
  '#1e88e5', // blau
  '#ffd600', // gelb
  '#e040fb', // magenta
  '#00e5ff', // türkis
  '#ff6d00', // orange
  '#651fff', // violett
  '#000000', // schwarz
  '#8d6e63', // braun
] as const;

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
