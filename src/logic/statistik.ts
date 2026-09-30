import { ERNTE_STATUS, type Baum, type ErnteStatus, type SaisonStatus, type Sorte } from '../model/typen';
import { statusNachBaum } from './filter';
import type { Sprache } from './sprache';
import { sortiereSorten } from './sorten';

export interface SortenZahl {
  /** null = ohne Sorte */
  sorte: Sorte | null;
  anzahl: number;
}

export interface StatusZahl {
  status: ErnteStatus;
  anzahl: number;
}

export interface BaumStatistik {
  gesamt: number;
  /** Alle aktiven Sorten (auch mit 0 Bäumen) nach Namen, „ohne Sorte“ zuletzt und nur wenn > 0. */
  proSorte: SortenZahl[];
  /** Alle drei Erntestatus der Saison in fester Reihenfolge; ohne Eintrag zählt ein Baum als nicht bereit. */
  proStatus: StatusZahl[];
}

/**
 * Zählt die aktiven Bäume, gesamt, pro Sorte und pro Erntestatus der Saison (saisonStatus = Einträge
 * der aktuellen Saison). Bäume, deren Sorte gelöscht oder unbekannt ist, zählen wie auf der Karte
 * (weißer Ring) als „ohne Sorte“.
 */
export function zaehleBaeume(
  baeume: readonly Baum[],
  sorten: readonly Sorte[],
  sprache: Sprache,
  saisonStatus: readonly SaisonStatus[] = [],
): BaumStatistik {
  const statusVon = statusNachBaum(saisonStatus);
  const proStatusZaehler = new Map<ErnteStatus, number>(ERNTE_STATUS.map((s) => [s, 0]));
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
    const status = statusVon(b.id);
    proStatusZaehler.set(status, (proStatusZaehler.get(status) ?? 0) + 1);
  }
  const proSorte: SortenZahl[] = aktiveSorten.map((s) => ({ sorte: s, anzahl: zaehler.get(s.id) ?? 0 }));
  const ohne = zaehler.get(null) ?? 0;
  if (ohne > 0) proSorte.push({ sorte: null, anzahl: ohne });
  const proStatus = ERNTE_STATUS.map((status) => ({ status, anzahl: proStatusZaehler.get(status) ?? 0 }));
  return { gesamt, proSorte, proStatus };
}
