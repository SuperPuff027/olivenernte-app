import { useSprache } from '../i18n/kontext';
import { RING_OHNE_SORTE, type SortenFilter } from '../logic/farben';
import { formatiereZahl } from '../logic/format';
import type { BaumStatistik } from '../logic/statistik';
import { Blatt } from './Blatt';

interface Props {
  statistik: BaumStatistik;
  filter: SortenFilter;
  /** Sorte antippen setzt den Filter, erneut antippen hebt ihn auf. */
  beiFilter: (filter: SortenFilter) => void;
  beiSchliessen: () => void;
}

/** Bäume gesamt und pro Sorte (mit Ringfarbe). */
export function Uebersicht({ statistik, filter, beiFilter, beiSchliessen }: Props) {
  const { t, sprache } = useSprache();
  return (
    <Blatt titel={t('statistik.titel')} beiSchliessen={beiSchliessen}>
      <p class="statistik-gesamt">
        <span>{t('statistik.gesamt')}</span>
        <strong>{formatiereZahl(statistik.gesamt, sprache)}</strong>
      </p>
      {statistik.gesamt === 0 && <p>{t('statistik.keine_baeume')}</p>}
      {statistik.proSorte.length > 0 && (
        <>
          <h3>{t('statistik.pro_sorte')}</h3>
          <p class="panel-hilfe">{t('filter.anleitung')}</p>
          <ul class="statistik-liste">
            {statistik.proSorte.map(({ sorte, anzahl }) => {
              const sorteId = sorte?.id ?? null;
              const aktiv = filter !== null && filter.sorteId === sorteId;
              return (
                <li key={sorteId ?? ''}>
                  <button
                    type="button"
                    class="statistik-zeile"
                    aria-pressed={aktiv}
                    onClick={() => beiFilter(aktiv ? null : { sorteId })}
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
          {filter && (
            <button type="button" class="knopf knopf-breit panel-knopf" onClick={() => beiFilter(null)}>
              {t('filter.aufheben')}
            </button>
          )}
        </>
      )}
    </Blatt>
  );
}
