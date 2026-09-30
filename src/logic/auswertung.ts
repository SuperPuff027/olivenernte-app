import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import type { Sprache } from './sprache';
import { sortiereSorten } from './sorten';

// Auswertungen über alle Saisons: Ertrag pro Sorte und Jahr, Bäume nach Ertrag,
// geschätzter Füllstand gegen tatsächlichen Ertrag (Grundlage für die Prognose in Phase 6).
// Es zählen nur aktive Bäume mit Status „geerntet“ und angegebener Menge.

const runde = (kg: number) => Math.round(kg * 10) / 10;

export interface Ernte {
  baum: Baum;
  jahr: number;
  kg: number;
  fuellstand: number | null;
  sorteId: string | null;
}

/** Alle gewerteten Ernten: aktive Bäume, Status „geerntet“, Menge angegeben. */
export function ernten(baeume: readonly Baum[], sorten: readonly Sorte[], saisonStatus: readonly SaisonStatus[]): Ernte[] {
  const baumNachId = new Map(baeume.filter((b) => !b.geloescht).map((b) => [b.id, b]));
  const aktiveSorten = new Set(sorten.filter((s) => !s.geloescht).map((s) => s.id));
  const ergebnis: Ernte[] = [];
  for (const s of saisonStatus) {
    const baum = baumNachId.get(s.baum_id);
    if (!baum || s.geloescht || s.status !== 'geerntet' || s.ertrag_kg === null) continue;
    const sorteId = baum.sorte_id !== null && aktiveSorten.has(baum.sorte_id) ? baum.sorte_id : null;
    ergebnis.push({ baum, jahr: s.jahr, kg: s.ertrag_kg, fuellstand: s.fuellstand, sorteId });
  }
  return ergebnis;
}

export interface JahresWert {
  kg: number;
  /** Anzahl Bäume mit Menge */
  baeume: number;
}

export interface SortenZeile {
  /** null = ohne Sorte */
  sorte: Sorte | null;
  proJahr: Map<number, JahresWert>;
}

export interface ErtragTabelle {
  /** Jahre mit Erträgen, neueste zuerst */
  jahre: number[];
  /** Sorten mit mindestens einem Ertrag, nach Namen; „ohne Sorte“ zuletzt */
  zeilen: SortenZeile[];
  summeProJahr: Map<number, JahresWert>;
}

function addiere(karte: Map<number, JahresWert>, jahr: number, kg: number) {
  const alt = karte.get(jahr) ?? { kg: 0, baeume: 0 };
  karte.set(jahr, { kg: alt.kg + kg, baeume: alt.baeume + 1 });
}

function gerundet(karte: Map<number, JahresWert>): Map<number, JahresWert> {
  return new Map([...karte].map(([jahr, w]) => [jahr, { ...w, kg: runde(w.kg) }]));
}

export function ertragProSorteUndJahr(
  alleErnten: readonly Ernte[],
  sorten: readonly Sorte[],
  sprache: Sprache,
): ErtragTabelle {
  const proSorte = new Map<string | null, Map<number, JahresWert>>();
  const summe = new Map<number, JahresWert>();
  for (const e of alleErnten) {
    const karte = proSorte.get(e.sorteId) ?? new Map<number, JahresWert>();
    addiere(karte, e.jahr, e.kg);
    proSorte.set(e.sorteId, karte);
    addiere(summe, e.jahr, e.kg);
  }
  const zeilen: SortenZeile[] = sortiereSorten(
    sorten.filter((s) => !s.geloescht && proSorte.has(s.id)),
    sprache,
  ).map((s) => ({ sorte: s, proJahr: gerundet(proSorte.get(s.id) ?? new Map()) }));
  const ohne = proSorte.get(null);
  if (ohne) zeilen.push({ sorte: null, proJahr: gerundet(ohne) });
  return { jahre: [...summe.keys()].sort((a, b) => b - a), zeilen, summeProJahr: gerundet(summe) };
}

export interface BaumErtrag {
  baum: Baum;
  kg: number;
}

/** Bäume einer Saison nach Ertrag: die stärksten und die schwächsten (ohne Überschneidung). */
export function baeumeNachErtrag(
  alleErnten: readonly Ernte[],
  jahr: number,
  anzahl: number,
): { staerkste: BaumErtrag[]; schwaechste: BaumErtrag[] } {
  const sortiert = alleErnten
    .filter((e) => e.jahr === jahr)
    .map((e) => ({ baum: e.baum, kg: e.kg }))
    .sort((a, b) => b.kg - a.kg || a.baum.nummer.localeCompare(b.baum.nummer));
  const staerkste = sortiert.slice(0, anzahl);
  const rest = sortiert.slice(staerkste.length);
  const schwaechste = rest.slice(Math.max(0, rest.length - anzahl)).reverse();
  return { staerkste, schwaechste };
}

export interface FuellstandStufe {
  stufe: number;
  /** Bäume mit dieser Schätzung und Menge */
  anzahl: number;
  /** Mittlerer Ertrag in kg; null ohne Bäume */
  mittelKg: number | null;
  minKg: number | null;
  maxKg: number | null;
}

/**
 * Geschätzter Füllstand gegen tatsächlichen Ertrag: je Stufe 1 … max der mittlere Ertrag.
 * jahr = null wertet alle Saisons zusammen aus. Stufen über max (nach Verkleinern) werden angehängt.
 */
export function fuellstandGegenErtrag(alleErnten: readonly Ernte[], jahr: number | null, max: number): FuellstandStufe[] {
  const proStufe = new Map<number, number[]>();
  for (const e of alleErnten) {
    if (e.fuellstand === null || (jahr !== null && e.jahr !== jahr)) continue;
    proStufe.set(e.fuellstand, [...(proStufe.get(e.fuellstand) ?? []), e.kg]);
  }
  const stufen = new Set<number>([...Array.from({ length: Math.max(1, max) }, (_, i) => i + 1), ...proStufe.keys()]);
  return [...stufen]
    .sort((a, b) => a - b)
    .map((stufe) => {
      const werte = proStufe.get(stufe) ?? [];
      if (werte.length === 0) return { stufe, anzahl: 0, mittelKg: null, minKg: null, maxKg: null };
      return {
        stufe,
        anzahl: werte.length,
        mittelKg: runde(werte.reduce((a, b) => a + b, 0) / werte.length),
        minKg: Math.min(...werte),
        maxKg: Math.max(...werte),
      };
    });
}
