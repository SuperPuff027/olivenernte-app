import { useEffect, useState } from 'preact/hooks';
import { ladeEinstellungen } from '../db/repo';
import { useSprache } from '../i18n/kontext';
import { saisonJahr, STANDARD_FUELLSTAND_MAX } from '../logic/datensatz';
import { innenfarbe, RING_OHNE_SORTE } from '../logic/farben';
import {
  istFilterAktiv,
  KEIN_FILTER,
  setzeFuellstand,
  umschalteSorte,
  umschalteStatus,
  vorschlagFuellstand,
  type BaumFilter,
} from '../logic/filter';
import { formatiereKg, formatiereZahl } from '../logic/format';
import type { BaumStatistik } from '../logic/statistik';
import { Blatt } from './Blatt';
import { Stufenwahl } from './Stufenwahl';

interface Props {
  statistik: BaumStatistik;
  filter: BaumFilter;
  /**
   * Sorte oder Status antippen setzt den Filter, erneut antippen hebt diesen Teil auf.
   * schliessen: danach gleich zur Karte (bei Sorte/Status), nicht beim Einstellen des Füllstands.
   */
  beiFilter: (filter: BaumFilter, schliessen: boolean) => void;
  beiSchliessen: () => void;
}

/** Bäume gesamt, pro Sorte (mit Ringfarbe) und pro Erntestatus (mit Punktfarbe); zugleich Filterauswahl. */
export function Uebersicht({ statistik, filter, beiFilter, beiSchliessen }: Props) {
  const { t, sprache } = useSprache();
  const [fuellstandMax, setFuellstandMax] = useState(STANDARD_FUELLSTAND_MAX);
  useEffect(() => {
    void ladeEinstellungen()
      .then((e) => setFuellstandMax(e.fuellstand_max))
      .catch(console.error);
  }, []);
  const bereich = filter.fuellstand;

  return (
    <Blatt titel={t('statistik.titel')} beiSchliessen={beiSchliessen}>
      <p class="statistik-gesamt">
        <span>{t('statistik.gesamt')}</span>
        <strong>{formatiereZahl(statistik.gesamt, sprache)}</strong>
      </p>
      {statistik.gesamt === 0 && <p>{t('statistik.keine_baeume')}</p>}

      {statistik.gesamt > 0 && (
        <section class="ernte-bilanz" aria-label={t('ernte.bilanz_titel', { jahr: saisonJahr(new Date()) })}>
          <h3>{t('ernte.bilanz_titel', { jahr: saisonJahr(new Date()) })}</h3>
          <p class="statistik-gesamt">
            <span>{t('ernte.ertrag_gesamt')}</span>
            <strong>{formatiereKg(statistik.ertrag.kg, sprache)}</strong>
          </p>
          <progress class="fortschritt" max={statistik.gesamt} value={statistik.ertrag.geerntet} />
          <p class="panel-hilfe">
            {t('ernte.geerntet_von', {
              n: formatiereZahl(statistik.ertrag.geerntet, sprache),
              gesamt: formatiereZahl(statistik.gesamt, sprache),
            })}
            {statistik.ertrag.ohneMenge > 0 &&
              ` · ${t('ernte.ohne_menge_anzahl', { n: formatiereZahl(statistik.ertrag.ohneMenge, sprache) })}`}
          </p>
        </section>
      )}

      <p class="panel-hilfe">{t('filter.anleitung')}</p>

      <h3>{t('statistik.pro_status')}</h3>
      <ul class="statistik-liste">
        {statistik.proStatus.map(({ status, anzahl }) => {
          const aktiv = filter.status === status;
          return (
            <li key={status}>
              <button
                type="button"
                class="statistik-zeile"
                aria-pressed={aktiv}
                onClick={() => beiFilter(umschalteStatus(filter, status), true)}
              >
                <span class="status-punkt" style={{ background: innenfarbe(status) }} aria-hidden="true" />
                <span class="statistik-name">{t(`status.${status}`)}</span>
                <strong>{formatiereZahl(anzahl, sprache)}</strong>
              </button>
            </li>
          );
        })}
      </ul>

      {statistik.proSorte.length > 0 && (
        <>
          <h3>{t('statistik.pro_sorte')}</h3>
          <ul class="statistik-liste">
            {statistik.proSorte.map(({ sorte, anzahl, ertragKg }) => {
              const sorteId = sorte?.id ?? null;
              const aktiv = filter.sorte !== null && filter.sorte.sorteId === sorteId;
              return (
                <li key={sorteId ?? ''}>
                  <button
                    type="button"
                    class="statistik-zeile"
                    aria-pressed={aktiv}
                    onClick={() => beiFilter(umschalteSorte(filter, sorteId), true)}
                  >
                    <span
                      class="sorte-punkt"
                      style={{ borderColor: sorte?.ringfarbe ?? RING_OHNE_SORTE }}
                      aria-hidden="true"
                    />
                    <span class="statistik-name">
                      {sorte?.name ?? t('sorten.ohne_sorte')}
                      {ertragKg > 0 && <small>{formatiereKg(ertragKg, sprache)}</small>}
                    </span>
                    <strong>{formatiereZahl(anzahl, sprache)}</strong>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <h3>{t('baum.fuellstand')}</h3>
      {bereich === null ? (
        <button
          type="button"
          class="knopf knopf-breit panel-knopf"
          onClick={() => beiFilter(setzeFuellstand(filter, vorschlagFuellstand(fuellstandMax), fuellstandMax), false)}
        >
          {t('filter.fuellstand_eingrenzen')}
        </button>
      ) : (
        <>
          <p class="stufenwahl-beschriftung">{t('filter.von')}</p>
          <Stufenwahl
            beschriftung={`${t('baum.fuellstand')} ${t('filter.von')}`}
            wert={bereich.von}
            bereich={{ min: 1, max: bereich.bis, schritt: 1 }}
            anzeige={formatiereZahl(bereich.von, sprache)}
            beiAenderung={(von) => beiFilter(setzeFuellstand(filter, { ...bereich, von }, fuellstandMax), false)}
          />
          <p class="stufenwahl-beschriftung">{t('filter.bis')}</p>
          <Stufenwahl
            beschriftung={`${t('baum.fuellstand')} ${t('filter.bis')}`}
            wert={bereich.bis}
            bereich={{ min: bereich.von, max: Math.max(bereich.von, fuellstandMax), schritt: 1 }}
            anzeige={formatiereZahl(bereich.bis, sprache)}
            beiAenderung={(bis) => beiFilter(setzeFuellstand(filter, { ...bereich, bis }, fuellstandMax), false)}
          />
          <p class="panel-hilfe">{t('filter.fuellstand_hinweis')}</p>
          <button
            type="button"
            class="knopf knopf-breit panel-knopf"
            onClick={() => beiFilter(setzeFuellstand(filter, null, fuellstandMax), false)}
          >
            {t('filter.fuellstand_egal')}
          </button>
        </>
      )}

      {istFilterAktiv(filter) && (
        <button type="button" class="knopf knopf-breit panel-knopf" onClick={() => beiFilter(KEIN_FILTER, true)}>
          {t('filter.aufheben')}
        </button>
      )}
    </Blatt>
  );
}
