import type { Sprache } from './sprache';

// Sprachabhängige Textfunktionen, damit türkisches i/İ und ı/I korrekt behandelt werden.

export function grossschreiben(text: string, sprache: Sprache): string {
  return text.toLocaleUpperCase(sprache);
}

export function kleinschreiben(text: string, sprache: Sprache): string {
  return text.toLocaleLowerCase(sprache);
}

export function vergleiche(a: string, b: string, sprache: Sprache): number {
  return a.localeCompare(b, sprache, { numeric: true, sensitivity: 'base' });
}

export function enthaelt(text: string, suche: string, sprache: Sprache): boolean {
  return kleinschreiben(text, sprache).includes(kleinschreiben(suche.trim(), sprache));
}
