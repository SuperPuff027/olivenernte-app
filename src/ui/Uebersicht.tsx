import { useSprache } from '../i18n/kontext';
import { RING_OHNE_SORTE } from '../logic/farben';
import { formatiereZahl } from '../logic/format';
import type { BaumStatistik } from '../logic/statistik';
import { Blatt } from './Blatt';

interface Props {
  statistik: BaumStatistik;
  beiSchliessen: () => void;
}

/** Bäume gesamt und pro Sorte (mit Ringfarbe). */
export function Uebersicht({ statistik, beiSchliessen }: Props) {
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
          <ul class="statistik-liste">
            {statistik.proSorte.map(({ sorte, anzahl }) => (
              <li key={sorte?.id ?? ''}>
                <span
                  class="sorte-punkt"
                  style={{ borderColor: sorte?.ringfarbe ?? RING_OHNE_SORTE }}
                  aria-hidden="true"
                />
                <span class="statistik-name">{sorte?.name ?? t('sorten.ohne_sorte')}</span>
                <strong>{formatiereZahl(anzahl, sprache)}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </Blatt>
  );
}
