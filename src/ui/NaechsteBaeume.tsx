import { useEffect, useState } from 'preact/hooks';
import type { Schluessel } from '../i18n';
import { useSprache } from '../i18n/kontext';
import { innenfarbe, RING_OHNE_SORTE } from '../logic/farben';
import type { FilterMerkmale } from '../logic/filter';
import { formatiereMeter } from '../logic/format';
import type { Punkt, Treffer } from '../logic/naechste';
import type { Baum, Sorte } from '../model/typen';
import { Blatt } from './Blatt';
import { standortFehlerText } from './texte';

interface Props {
  /** Beschreibung des aktiven Filters oder null ohne Filter */
  filterText: string | null;
  sorten: readonly Sorte[];
  merkmale: (baum: Baum) => FilterMerkmale;
  /** Sucht die nächsten passenden Bäume zum Standort */
  suche: (standort: Punkt) => Treffer[];
  beiWahl: (baum: Baum) => void;
  beiSchliessen: () => void;
}

const STANDORT_ZEITLIMIT_MS = 20_000;
/** Ein wenige Sekunden alter Fix reicht für eine Entfernungsliste. */
const STANDORT_HOECHSTALTER_MS = 10_000;

type Zustand =
  | { art: 'sucht' }
  | { art: 'fertig'; genauigkeit: number; treffer: Treffer[] }
  | { art: 'fehler'; schluessel: Schluessel };

/** Liste der nächsten passenden Bäume zum eigenen Standort (ein GPS-Fix). */
export function NaechsteBaeume({ filterText, sorten, merkmale, suche, beiWahl, beiSchliessen }: Props) {
  const { t, sprache } = useSprache();
  const [zustand, setZustand] = useState<Zustand>({ art: 'sucht' });
  const [versuch, setVersuch] = useState(0);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setZustand({ art: 'fehler', schluessel: 'gps.nicht_unterstuetzt' });
      return;
    }
    let aktiv = true;
    setZustand({ art: 'sucht' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!aktiv) return;
        const standort = { lat: p.coords.latitude, lon: p.coords.longitude };
        setZustand({ art: 'fertig', genauigkeit: p.coords.accuracy, treffer: suche(standort) });
      },
      (e) => aktiv && setZustand({ art: 'fehler', schluessel: standortFehlerText(e.code) }),
      { enableHighAccuracy: true, timeout: STANDORT_ZEITLIMIT_MS, maximumAge: STANDORT_HOECHSTALTER_MS },
    );
    return () => {
      aktiv = false;
    };
    // Suche nur beim Öffnen und bei „Erneut“, nicht bei jeder neuen Suchfunktion.
  }, [versuch]);

  const sorteVon = (baum: Baum) => sorten.find((s) => s.id === merkmale(baum).sorteId) ?? null;

  return (
    <Blatt titel={t('naechste.titel')} beiSchliessen={beiSchliessen}>
      <p class="panel-hilfe">{filterText ? t('naechste.filter', { filter: filterText }) : t('naechste.ohne_filter')}</p>
      <p class="panel-hilfe">{t('naechste.hinweis_geerntet')}</p>

      {zustand.art === 'sucht' && <p>{t('naechste.standort_suchen')}</p>}
      {zustand.art === 'fehler' && (
        <>
          <p class="text-fehler">{t(zustand.schluessel)}</p>
          <button type="button" class="knopf knopf-breit panel-knopf" onClick={() => setVersuch((v) => v + 1)}>
            {t('offline.erneut')}
          </button>
        </>
      )}
      {zustand.art === 'fertig' && (
        <>
          <p class="panel-hilfe">
            {t('naechste.standort_genau', { wert: formatiereMeter(Math.round(zustand.genauigkeit), sprache) })}
          </p>
          {zustand.treffer.length === 0 ? (
            <p>{t('naechste.keine')}</p>
          ) : (
            <ul class="statistik-liste">
              {zustand.treffer.map(({ baum, abstandM, richtung }) => {
                const sorte = sorteVon(baum);
                return (
                  <li key={baum.id}>
                    <button type="button" class="statistik-zeile" onClick={() => beiWahl(baum)}>
                      <span
                        class="baum-symbol"
                        style={{ background: innenfarbe(merkmale(baum).status), borderColor: sorte?.ringfarbe ?? RING_OHNE_SORTE }}
                        aria-hidden="true"
                      />
                      <span class="statistik-name">
                        {baum.nummer}
                        <small>{sorte?.name ?? t('sorten.ohne_sorte')}</small>
                      </span>
                      <strong>
                        {formatiereMeter(Math.round(abstandM), sprache)} {t(`richtung.${richtung}`)}
                      </strong>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button type="button" class="knopf knopf-breit panel-knopf" onClick={() => setVersuch((v) => v + 1)}>
            {t('naechste.aktualisieren')}
          </button>
        </>
      )}
    </Blatt>
  );
}
