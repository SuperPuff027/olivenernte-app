import type { Baum, ErnteStatus, SaisonStatus, Sorte } from '../model/typen';
import { STANDARD_STATUS } from './datensatz';

/**
 * Filter der Kartenansicht: nach Sorte und/oder Erntestatus der aktuellen Saison.
 * - sorte: null = egal; { sorteId: null } = nur Bäume ohne Sorte
 * - status: null = egal
 * Sind beide gesetzt, muss ein Baum beides erfüllen.
 */
export interface BaumFilter {
  sorte: { sorteId: string | null } | null;
  status: ErnteStatus | null;
}

export const KEIN_FILTER: BaumFilter = { sorte: null, status: null };

export function istFilterAktiv(filter: BaumFilter): boolean {
  return filter.sorte !== null || filter.status !== null;
}

/** Sorte antippen: setzen, oder aufheben, wenn sie schon gewählt ist. */
export function umschalteSorte(filter: BaumFilter, sorteId: string | null): BaumFilter {
  const gewaehlt = filter.sorte !== null && filter.sorte.sorteId === sorteId;
  return { ...filter, sorte: gewaehlt ? null : { sorteId } };
}

/** Status antippen: setzen, oder aufheben, wenn er schon gewählt ist. */
export function umschalteStatus(filter: BaumFilter, status: ErnteStatus): BaumFilter {
  return { ...filter, status: filter.status === status ? null : status };
}

/**
 * Sorte eines Baums, wie die Karte sie zeigt: gelöschte oder unbekannte Sorten gelten
 * als „ohne Sorte“ (null).
 */
export function wirksameSorte(baum: Baum, aktiveSortenIds: ReadonlySet<string>): string | null {
  return baum.sorte_id !== null && aktiveSortenIds.has(baum.sorte_id) ? baum.sorte_id : null;
}

/** Status der Saison je Baum; ohne Eintrag gilt der Standardstatus. */
export function statusNachBaum(saisonStatus: readonly SaisonStatus[]): (baumId: string) => ErnteStatus {
  const nachBaum = new Map(saisonStatus.filter((s) => !s.geloescht).map((s) => [s.baum_id, s.status]));
  return (baumId) => nachBaum.get(baumId) ?? STANDARD_STATUS;
}

export function passtZuFilter(sorteId: string | null, status: ErnteStatus, filter: BaumFilter): boolean {
  return (filter.sorte === null || filter.sorte.sorteId === sorteId) && (filter.status === null || filter.status === status);
}

/** Anzahl aktiver Bäume, die zum Filter passen (für die Anzeige neben dem Zähler). */
export function zaehleTreffer(
  baeume: readonly Baum[],
  sorten: readonly Sorte[],
  saisonStatus: readonly SaisonStatus[],
  filter: BaumFilter,
): number {
  const aktiveSorten = new Set(sorten.filter((s) => !s.geloescht).map((s) => s.id));
  const statusVon = statusNachBaum(saisonStatus);
  return baeume.filter((b) => !b.geloescht && passtZuFilter(wirksameSorte(b, aktiveSorten), statusVon(b.id), filter)).length;
}
