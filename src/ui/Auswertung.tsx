import { useEffect, useMemo, useState } from 'preact/hooks';
import { ladeBestand } from '../db/import';
import { ladeAlleSaisonStatus, ladeHain } from '../db/repo';
import { useSprache } from '../i18n/kontext';
import {
  baeumeNachErtrag,
  ernten,
  ertragProSorteUndJahr,
  fuellstandGegenErtrag,
  type BaumErtrag,
  type Ernte,
} from '../logic/auswertung';
import { RING_OHNE_SORTE } from '../logic/farben';
import { formatiereKg, formatiereZahl } from '../logic/format';
import type { Baum, Sorte } from '../model/typen';
import { Blatt } from './Blatt';

interface Props {
  /** Angezeigte Saison als Vorauswahl */
  saison: number;
  /** Baum in der Rangliste angetippt: Karte dorthin, Panel öffnen */
  beiBaum: (baum: Baum) => void;
  beiSchliessen: () => void;
  beiFehler: () => void;
}

const RANGLISTE_ANZAHL = 5;

interface Daten {
  alleErnten: Ernte[];
  sorten: readonly Sorte[];
  fuellstandMax: number;
}

/** Auswertungen über alle Saisons (nur geerntete Bäume mit Menge). */
export function Auswertung({ saison, beiBaum, beiSchliessen, beiFehler }: Props) {
  const { t, sprache } = useSprache();
  const [daten, setDaten] = useState<Daten | null>(null);
  /** Jahr für Rangliste und Füllstand; null = alle Jahre (nur Füllstand) */
  const [jahr, setJahr] = useState<number | null>(saison);

  useEffect(() => {
    void Promise.all([ladeBestand(), ladeAlleSaisonStatus(), ladeHain()])
      .then(([bestand, status, hain]) =>
        setDaten({
          alleErnten: ernten(bestand.baeume, bestand.sorten, status),
          sorten: bestand.sorten,
          fuellstandMax: hain.fuellstand_max,
        }),
      )
      .catch((e: unknown) => {
        console.error(e);
        beiFehler();
      });
  }, []);

  const tabelle = useMemo(
    () => (daten ? ertragProSorteUndJahr(daten.alleErnten, daten.sorten, sprache) : null),
    [daten, sprache],
  );

  // Vorauswahl: angezeigte Saison, sonst die neueste mit Erträgen.
  useEffect(() => {
    if (tabelle && jahr !== null && !tabelle.jahre.includes(jahr)) setJahr(tabelle.jahre[0] ?? saison);
  }, [tabelle]);

  if (!daten || !tabelle) return <Blatt titel={t('auswertung.titel')} beiSchliessen={beiSchliessen}>{null}</Blatt>;

  const kg = (wert: number) => formatiereKg(wert, sprache);
  const anzahlBaeume = (n: number) =>
    n === 1 ? t('auswertung.ein_baum') : t('auswertung.baeume_anzahl', { n: formatiereZahl(n, sprache) });

  if (tabelle.jahre.length === 0) {
    return (
      <Blatt titel={t('auswertung.titel')} beiSchliessen={beiSchliessen}>
        <p>{t('auswertung.leer')}</p>
      </Blatt>
    );
  }

  const rangliste = jahr === null ? null : baeumeNachErtrag(daten.alleErnten, jahr, RANGLISTE_ANZAHL);
  const stufen = fuellstandGegenErtrag(daten.alleErnten, jahr, daten.fuellstandMax);
  const hoechsterMittelwert = Math.max(0, ...stufen.map((s) => s.mittelKg ?? 0));

  const baumListe = (liste: BaumErtrag[], groesster: number) => (
    <ul class="statistik-liste">
      {liste.map(({ baum, kg: menge }) => (
        <li key={baum.id}>
          <button type="button" class="statistik-zeile" onClick={() => beiBaum(baum)}>
            <span class="statistik-name">
              {baum.nummer}
              <span class="balken" style={{ width: `${groesster > 0 ? (menge / groesster) * 100 : 0}%` }} />
            </span>
            <strong>{kg(menge)}</strong>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Blatt titel={t('auswertung.titel')} beiSchliessen={beiSchliessen}>
      <p class="panel-hilfe">{t('auswertung.hinweis')}</p>

      <h3>{t('auswertung.pro_sorte')}</h3>
      <div class="tabelle-rahmen">
        <table class="auswertung-tabelle">
          <thead>
            <tr>
              <th scope="col">{t('baum.sorte')}</th>
              {tabelle.jahre.map((j) => (
                <th key={j} scope="col">
                  {j}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabelle.zeilen.map((z) => (
              <tr key={z.sorte?.id ?? ''}>
                <th scope="row">
                  <span
                    class="sorte-punkt klein"
                    style={{ borderColor: z.sorte?.ringfarbe ?? RING_OHNE_SORTE }}
                    aria-hidden="true"
                  />
                  {z.sorte?.name ?? t('sorten.ohne_sorte')}
                </th>
                {tabelle.jahre.map((j) => {
                  const w = z.proJahr.get(j);
                  return (
                    <td key={j}>
                      {w ? (
                        <>
                          {kg(w.kg)}
                          <small>{anzahlBaeume(w.baeume)}</small>
                        </>
                      ) : (
                        '–'
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{t('auswertung.gesamt')}</th>
              {tabelle.jahre.map((j) => {
                const w = tabelle.summeProJahr.get(j);
                return (
                  <td key={j}>
                    {w && (
                      <>
                        {kg(w.kg)}
                        <small>{anzahlBaeume(w.baeume)}</small>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="saison-wahl" role="group" aria-label={t('saison.titel')}>
        {tabelle.jahre.map((j) => (
          <button key={j} type="button" class="knopf wahl-knopf" aria-pressed={jahr === j} onClick={() => setJahr(j)}>
            {j}
          </button>
        ))}
        <button type="button" class="knopf wahl-knopf" aria-pressed={jahr === null} onClick={() => setJahr(null)}>
          {t('auswertung.alle_jahre')}
        </button>
      </div>

      {rangliste && jahr !== null && (
        <>
          <h3>{t('auswertung.staerkste', { jahr })}</h3>
          {baumListe(rangliste.staerkste, rangliste.staerkste[0]?.kg ?? 0)}
          {rangliste.schwaechste.length > 0 && (
            <>
              <h3>{t('auswertung.schwaechste', { jahr })}</h3>
              {baumListe(rangliste.schwaechste, rangliste.staerkste[0]?.kg ?? 0)}
            </>
          )}
        </>
      )}

      <h3>
        {jahr === null
          ? t('auswertung.fuellstand_alle')
          : t('auswertung.fuellstand_jahr', { jahr })}
      </h3>
      <p class="panel-hilfe">{t('auswertung.fuellstand_hinweis')}</p>
      <ul class="statistik-liste">
        {stufen.map((s) => (
          <li key={s.stufe} class="fuellstand-zeile">
            <span class="statistik-name">
              {t('verlauf.fuellstand', { wert: s.stufe })}
              {s.mittelKg !== null && (
                <span class="balken" style={{ width: `${hoechsterMittelwert > 0 ? (s.mittelKg / hoechsterMittelwert) * 100 : 0}%` }} />
              )}
            </span>
            <span class="fuellstand-wert">
              {s.mittelKg === null ? (
                t('auswertung.keine_daten')
              ) : (
                <>
                  <strong>{t('auswertung.mittel', { kg: kg(s.mittelKg) })}</strong>
                  <small>
                    {anzahlBaeume(s.anzahl)}
                    {s.anzahl > 1 && s.minKg !== null && s.maxKg !== null && ` · ${kg(s.minKg)}–${kg(s.maxKg)}`}
                  </small>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Blatt>
  );
}
