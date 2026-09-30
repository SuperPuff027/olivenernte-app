import { ERNTE_STATUS, type Baum, type ErnteStatus, type SaisonStatus, type Sorte } from '../model/typen';
import { STANDARD_STATUS } from './datensatz';

export interface FuellstandBereich {
  von: number;
  bis: number;
}

/**
 * Filter der Kartenansicht nach Sorte, Erntestatus und Füllstand der aktuellen Saison.
 * - sorte: null = egal; { sorteId: null } = nur Bäume ohne Sorte
 * - status: null = egal
 * - fuellstand: null = egal; sonst passen nur Bäume mit geschätztem Füllstand im Bereich
 * Was gesetzt ist, muss alles passen.
 */
export interface BaumFilter {
  sorte: { sorteId: string | null } | null;
  status: ErnteStatus | null;
  fuellstand: FuellstandBereich | null;
}

export const KEIN_FILTER: BaumFilter = { sorte: null, status: null, fuellstand: null };

/** Was vom Baum für den Filter zählt */
export interface FilterMerkmale {
  sorteId: string | null;
  status: ErnteStatus;
  fuellstand: number | null;
}

export function istFilterAktiv(filter: BaumFilter): boolean {
  return filter.sorte !== null || filter.status !== null || filter.fuellstand !== null;
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
 * Füllstand-Bereich setzen (null = egal). Werte werden auf ganze Stufen 1 … max begrenzt,
 * „von“ und „bis“ bei Bedarf getauscht.
 */
export function setzeFuellstand(filter: BaumFilter, bereich: FuellstandBereich | null, max: number): BaumFilter {
  if (!bereich) return { ...filter, fuellstand: null };
  const obergrenze = Math.max(1, Math.floor(max));
  const stufe = (wert: number) => (Number.isFinite(wert) ? Math.min(obergrenze, Math.max(1, Math.round(wert))) : 1);
  const a = stufe(bereich.von);
  const b = stufe(bereich.bis);
  return { ...filter, fuellstand: { von: Math.min(a, b), bis: Math.max(a, b) } };
}

/** Vorschlag beim Einschalten des Füllstand-Filters: die obere Hälfte (volle Bäume zuerst ernten). */
export function vorschlagFuellstand(max: number): FuellstandBereich {
  const obergrenze = Math.max(1, Math.floor(max));
  return { von: Math.ceil((obergrenze + 1) / 2), bis: obergrenze };
}

/**
 * Sorte eines Baums, wie die Karte sie zeigt: gelöschte oder unbekannte Sorten gelten
 * als „ohne Sorte“ (null).
 */
export function wirksameSorte(baum: Baum, aktiveSortenIds: ReadonlySet<string>): string | null {
  return baum.sorte_id !== null && aktiveSortenIds.has(baum.sorte_id) ? baum.sorte_id : null;
}

/** Saisonstatus je Baum; ohne Eintrag gilt der Standardstatus ohne Füllstand. */
export function saisonNachBaum(
  saisonStatus: readonly SaisonStatus[],
): (baumId: string) => { status: ErnteStatus; fuellstand: number | null } {
  const nachBaum = new Map(saisonStatus.filter((s) => !s.geloescht).map((s) => [s.baum_id, s]));
  return (baumId) => {
    const s = nachBaum.get(baumId);
    return { status: s?.status ?? STANDARD_STATUS, fuellstand: s?.fuellstand ?? null };
  };
}

/** Status der Saison je Baum; ohne Eintrag gilt der Standardstatus. */
export function statusNachBaum(saisonStatus: readonly SaisonStatus[]): (baumId: string) => ErnteStatus {
  const saison = saisonNachBaum(saisonStatus);
  return (baumId) => saison(baumId).status;
}

export function passtZuFilter(merkmale: FilterMerkmale, filter: BaumFilter): boolean {
  const { sorte, status, fuellstand } = filter;
  if (sorte !== null && sorte.sorteId !== merkmale.sorteId) return false;
  if (status !== null && status !== merkmale.status) return false;
  if (fuellstand !== null) {
    if (merkmale.fuellstand === null) return false;
    if (merkmale.fuellstand < fuellstand.von || merkmale.fuellstand > fuellstand.bis) return false;
  }
  return true;
}

/** Filtermerkmale aller Bäume aus Sorten und Saisonstatus (für Karte, Zähler und Suche). */
export function erstelleMerkmale(
  sorten: readonly Sorte[],
  saisonStatus: readonly SaisonStatus[],
): (baum: Baum) => FilterMerkmale {
  const aktiveSorten = new Set(sorten.filter((s) => !s.geloescht).map((s) => s.id));
  const saison = saisonNachBaum(saisonStatus);
  return (baum) => ({ sorteId: wirksameSorte(baum, aktiveSorten), ...saison(baum.id) });
}

/** Anzahl aktiver Bäume, die zum Filter passen (für die Anzeige neben dem Zähler). */
export function zaehleTreffer(
  baeume: readonly Baum[],
  sorten: readonly Sorte[],
  saisonStatus: readonly SaisonStatus[],
  filter: BaumFilter,
): number {
  const merkmale = erstelleMerkmale(sorten, saisonStatus);
  return baeume.filter((b) => !b.geloescht && passtZuFilter(merkmale(b), filter)).length;
}

const MAX_FUELLSTAND_STUFE = 100;

/**
 * Prüft einen gespeicherten Filter (z. B. aus localStorage). Ungültige Teile werden verworfen,
 * der Rest bleibt erhalten; ganz ungültige Daten ergeben KEIN_FILTER.
 */
export function pruefeFilter(wert: unknown): BaumFilter {
  if (typeof wert !== 'object' || wert === null || Array.isArray(wert)) return KEIN_FILTER;
  const roh = wert as Record<string, unknown>;

  let sorte: BaumFilter['sorte'] = null;
  if (typeof roh.sorte === 'object' && roh.sorte !== null) {
    const id = (roh.sorte as Record<string, unknown>).sorteId;
    if (id === null || (typeof id === 'string' && id !== '')) sorte = { sorteId: id };
  }

  const status = ERNTE_STATUS.find((s) => s === roh.status) ?? null;

  let fuellstand: FuellstandBereich | null = null;
  if (typeof roh.fuellstand === 'object' && roh.fuellstand !== null) {
    const { von, bis } = roh.fuellstand as Record<string, unknown>;
    const gueltig = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_FUELLSTAND_STUFE;
    if (gueltig(von) && gueltig(bis) && von <= bis) fuellstand = { von, bis };
  }

  return { sorte, status, fuellstand };
}
