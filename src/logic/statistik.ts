import type { Baum, Sorte } from '../model/typen';
import type { Sprache } from './sprache';
import { sortiereSorten } from './sorten';

export interface SortenZahl {
  /** null = ohne Sorte */
  sorte: Sorte | null;
  anzahl: number;
}

export interface BaumStatistik {
  gesamt: number;
  /** Alle aktiven Sorten (auch mit 0 Bäumen) nach Namen, „ohne Sorte“ zuletzt und nur wenn > 0. */
  proSorte: SortenZahl[];
}

/**
 * Zählt die aktiven Bäume, gesamt und pro Sorte. Bäume, deren Sorte gelöscht oder unbekannt ist,
 * zählen wie auf der Karte (weißer Ring) als „ohne Sorte“.
 */
export function zaehleBaeume(baeume: readonly Baum[], sorten: readonly Sorte[], sprache: Sprache): BaumStatistik {
  const aktiveSorten = sortiereSorten(
    sorten.filter((s) => !s.geloescht),
    sprache,
  );
  const zaehler = new Map<string | null, number>(aktiveSorten.map((s) => [s.id, 0]));
  let gesamt = 0;
  for (const b of baeume) {
    if (b.geloescht) continue;
    gesamt++;
    const schluessel = b.sorte_id !== null && zaehler.has(b.sorte_id) ? b.sorte_id : null;
    zaehler.set(schluessel, (zaehler.get(schluessel) ?? 0) + 1);
  }
  const proSorte: SortenZahl[] = aktiveSorten.map((s) => ({ sorte: s, anzahl: zaehler.get(s.id) ?? 0 }));
  const ohne = zaehler.get(null) ?? 0;
  if (ohne > 0) proSorte.push({ sorte: null, anzahl: ohne });
  return { gesamt, proSorte };
}
