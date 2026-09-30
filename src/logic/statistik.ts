import { ERNTE_STATUS, type Baum, type ErnteStatus, type SaisonStatus, type Sorte } from '../model/typen';
import { STANDARD_STATUS } from './datensatz';
import type { Sprache } from './sprache';
import { sortiereSorten } from './sorten';

export interface SortenZahl {
  /** null = ohne Sorte */
  sorte: Sorte | null;
  anzahl: number;
  /** Summe der Erträge geernteter Bäume dieser Sorte in kg */
  ertragKg: number;
}

export interface StatusZahl {
  status: ErnteStatus;
  anzahl: number;
}

export interface ErtragSumme {
  /** Summe aller Mengen geernteter Bäume in kg (auf 0,1 kg gerundet) */
  kg: number;
  /** Anzahl geernteter Bäume */
  geerntet: number;
  /** davon ohne Mengenangabe */
  ohneMenge: number;
}

export interface BaumStatistik {
  gesamt: number;
  /** Alle aktiven Sorten (auch mit 0 Bäumen) nach Namen, „ohne Sorte“ zuletzt und nur wenn > 0. */
  proSorte: SortenZahl[];
  /** Alle drei Erntestatus der Saison in fester Reihenfolge; ohne Eintrag zählt ein Baum als nicht bereit. */
  proStatus: StatusZahl[];
  ertrag: ErtragSumme;
}

const runde = (kg: number) => Math.round(kg * 10) / 10;

/**
 * Zählt die aktiven Bäume, gesamt, pro Sorte und pro Erntestatus der Saison (saisonStatus = Einträge
 * der aktuellen Saison), und summiert den Ertrag. Ertrag zählt nur, solange der Baum als geerntet
 * markiert ist (ein zurückgesetzter Baum behält seine Menge, sie zählt aber nicht mit).
 * Bäume, deren Sorte gelöscht oder unbekannt ist, zählen wie auf der Karte als „ohne Sorte“.
 */
export function zaehleBaeume(
  baeume: readonly Baum[],
  sorten: readonly Sorte[],
  sprache: Sprache,
  saisonStatus: readonly SaisonStatus[] = [],
): BaumStatistik {
  const saisonNachBaum = new Map(saisonStatus.filter((s) => !s.geloescht).map((s) => [s.baum_id, s]));
  const aktiveSorten = sortiereSorten(
    sorten.filter((s) => !s.geloescht),
    sprache,
  );
  const proSorteZaehler = new Map<string | null, { anzahl: number; ertragKg: number }>(
    aktiveSorten.map((s) => [s.id, { anzahl: 0, ertragKg: 0 }]),
  );
  const proStatusZaehler = new Map<ErnteStatus, number>(ERNTE_STATUS.map((s) => [s, 0]));
  const ertrag: ErtragSumme = { kg: 0, geerntet: 0, ohneMenge: 0 };
  let gesamt = 0;

  for (const b of baeume) {
    if (b.geloescht) continue;
    gesamt++;
    const schluessel = b.sorte_id !== null && proSorteZaehler.has(b.sorte_id) ? b.sorte_id : null;
    const sorteZahl = proSorteZaehler.get(schluessel) ?? { anzahl: 0, ertragKg: 0 };
    sorteZahl.anzahl++;

    const saison = saisonNachBaum.get(b.id);
    const status = saison?.status ?? STANDARD_STATUS;
    proStatusZaehler.set(status, (proStatusZaehler.get(status) ?? 0) + 1);
    if (status === 'geerntet') {
      ertrag.geerntet++;
      if (saison?.ertrag_kg == null) {
        ertrag.ohneMenge++;
      } else {
        ertrag.kg += saison.ertrag_kg;
        sorteZahl.ertragKg += saison.ertrag_kg;
      }
    }
    proSorteZaehler.set(schluessel, sorteZahl);
  }

  const zahl = (id: string | null) => proSorteZaehler.get(id) ?? { anzahl: 0, ertragKg: 0 };
  const proSorte: SortenZahl[] = aktiveSorten.map((s) => ({
    sorte: s,
    anzahl: zahl(s.id).anzahl,
    ertragKg: runde(zahl(s.id).ertragKg),
  }));
  const ohne = zahl(null);
  if (ohne.anzahl > 0) proSorte.push({ sorte: null, anzahl: ohne.anzahl, ertragKg: runde(ohne.ertragKg) });
  const proStatus = ERNTE_STATUS.map((status) => ({ status, anzahl: proStatusZaehler.get(status) ?? 0 }));
  return { gesamt, proSorte, proStatus, ertrag: { ...ertrag, kg: runde(ertrag.kg) } };
}
