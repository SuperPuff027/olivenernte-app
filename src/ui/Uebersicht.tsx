import { useSprache } from '../i18n/kontext';
import { innenfarbe, RING_OHNE_SORTE } from '../logic/farben';
import { istFilterAktiv, KEIN_FILTER, umschalteSorte, umschalteStatus, type BaumFilter } from '../logic/filter';
import { formatiereZahl } from '../logic/format';
import type { BaumStatistik } from '../logic/statistik';
import { Blatt } from './Blatt';

interface Props {
  statistik: BaumStatistik;
  filter: BaumFilter;
  /** Sorte oder Status antippen setzt den Filter, erneut antippen hebt diesen Teil auf. */
  beiFilter: (filter: BaumFilter) => void;
  beiSchliessen: () => void;
}

/** Bäume gesamt, pro Sorte (mit Ringfarbe) und pro Erntestatus (mit Punktfarbe); zugleich Filterauswahl. */
export function Uebersicht({ statistik, filter, beiFilter, beiSchliessen }: Props) {
  const { t, sprache } = useSprache();
  return (
    <Blatt titel={t('statistik.titel')} beiSchliessen={beiSchliessen}>
      <p class="statistik-gesamt">
        <span>{t('statistik.gesamt')}</span>
        <strong>{formatiereZahl(statistik.gesamt, sprache)}</strong>
      </p>
      {statistik.gesamt === 0 && <p>{t('statistik.keine_baeume')}</p>}
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
                onClick={() => beiFilter(umschalteStatus(filter, status))}
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
            {statistik.proSorte.map(({ sorte, anzahl }) => {
              const sorteId = sorte?.id ?? null;
              const aktiv = filter.sorte !== null && filter.sorte.sorteId === sorteId;
              return (
                <li key={sorteId ?? ''}>
                  <button
                    type="button"
                    class="statistik-zeile"
                    aria-pressed={aktiv}
                    onClick={() => beiFilter(umschalteSorte(filter, sorteId))}
                  >
                    <span
                      class="sorte-punkt"
                      style={{ borderColor: sorte?.ringfarbe ?? RING_OHNE_SORTE }}
                      aria-hidden="true"
                    />
                    <span class="statistik-name">{sorte?.name ?? t('sorten.ohne_sorte')}</span>
                    <strong>{formatiereZahl(anzahl, sprache)}</strong>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {istFilterAktiv(filter) && (
        <button type="button" class="knopf knopf-breit panel-knopf" onClick={() => beiFilter(KEIN_FILTER)}>
          {t('filter.aufheben')}
        </button>
      )}
    </Blatt>
  );
}
