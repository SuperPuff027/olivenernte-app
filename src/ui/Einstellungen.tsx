import { useEffect, useState } from 'preact/hooks';
import { aendereEinstellungen, ladeEinstellungen, type EinstellungsAenderung } from '../db/repo';
import { belegterSpeicher, fordereDauerhaftenSpeicher, pruefeSpeicher } from '../db/speicher';
import { useSprache } from '../i18n/kontext';
import {
  FUELLSTAND_MAX_BEREICH,
  istIos,
  speicherHinweis,
  ZIEL_GENAUIGKEIT_BEREICH,
  type SpeicherZustand,
} from '../logic/einstellungen';
import { formatiereMeter, formatiereZahl } from '../logic/format';
import { ermittleSprache, SPRACHEN, type Sprache } from '../logic/sprache';
import type { Einstellungen as EinstellungsDaten } from '../model/typen';
import { Blatt } from './Blatt';
import { Stufenwahl } from './Stufenwahl';

interface Props {
  beiSchliessen: () => void;
  beiFehler: () => void;
}

const BYTE_PRO_MB = 1024 * 1024;

function istInstalliert(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || matchMedia('(display-mode: standalone)').matches;
}

export function Einstellungen({ beiSchliessen, beiFehler }: Props) {
  const { t, sprache, setzeSprache } = useSprache();
  const [daten, setDaten] = useState<EinstellungsDaten | null>(null);
  const [speicher, setSpeicher] = useState<SpeicherZustand | null>(null);
  const [belegt, setBelegt] = useState<number | null>(null);
  const installiert = istInstalliert();
  const ios = istIos(navigator.userAgent, navigator.maxTouchPoints);
  const geraeteSprache = ermittleSprache(null, navigator.languages);

  useEffect(() => {
    void Promise.all([ladeEinstellungen(), pruefeSpeicher(navigator.storage), belegterSpeicher(navigator.storage)])
      .then(([e, s, b]) => {
        setDaten(e);
        setSpeicher(s);
        setBelegt(b);
      })
      .catch((e: unknown) => {
        console.error(e);
        beiFehler();
      });
  }, []);

  async function aendere(aenderung: EinstellungsAenderung) {
    try {
      setDaten(await aendereEinstellungen(aenderung));
    } catch (e) {
      console.error(e);
      beiFehler();
    }
  }

  function waehleSprache(wahl: Sprache | null) {
    setzeSprache(ermittleSprache(wahl, navigator.languages));
    void aendere({ sprache: wahl });
  }

  const hinweis = speicher ? speicherHinweis(speicher, { ios, installiert }) : 'keiner';

  return (
    <Blatt titel={t('einstellungen.titel')} beiSchliessen={beiSchliessen}>
      {daten && (
        <>
          <h3>{t('einstellungen.sprache')}</h3>
          <div class="wahl-liste" role="radiogroup" aria-label={t('einstellungen.sprache')}>
            <button
              type="button"
              role="radio"
              class="knopf sprach-knopf"
              aria-checked={daten.sprache === null}
              onClick={() => waehleSprache(null)}
            >
              {t('einstellungen.sprache_geraet', { sprache: t(`sprache.${geraeteSprache}`) })}
            </button>
            {SPRACHEN.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                lang={s}
                class="knopf sprach-knopf"
                aria-checked={daten.sprache === s}
                onClick={() => waehleSprache(s)}
              >
                {t(`sprache.${s}`)}
              </button>
            ))}
          </div>

          <h3>{t('einstellungen.fuellstand_max')}</h3>
          <Stufenwahl
            beschriftung={t('einstellungen.fuellstand_max')}
            wert={daten.fuellstand_max}
            bereich={FUELLSTAND_MAX_BEREICH}
            anzeige={formatiereZahl(daten.fuellstand_max, sprache)}
            beiAenderung={(wert) => void aendere({ fuellstand_max: wert })}
          />
          <p class="panel-hilfe">{t('einstellungen.fuellstand_max_hilfe')}</p>

          <h3>{t('einstellungen.ziel_genauigkeit')}</h3>
          <Stufenwahl
            beschriftung={t('einstellungen.ziel_genauigkeit')}
            wert={daten.ziel_gps_genauigkeit_m}
            bereich={ZIEL_GENAUIGKEIT_BEREICH}
            anzeige={`± ${formatiereMeter(daten.ziel_gps_genauigkeit_m, sprache)}`}
            beiAenderung={(wert) => void aendere({ ziel_gps_genauigkeit_m: wert })}
          />
          <p class="panel-hilfe">{t('einstellungen.ziel_genauigkeit_hilfe')}</p>
        </>
      )}

      <h3>{t('einstellungen.speicher')}</h3>
      {speicher && (
        <p class={speicher === 'dauerhaft' ? 'gps-erreicht' : 'text-fehler'}>{t(`speicher.${speicher}`)}</p>
      )}
      <p class="panel-hilfe">{t(installiert ? 'speicher.installiert' : 'speicher.nicht_installiert')}</p>
      {belegt !== null && (
        <p class="panel-hilfe">{t('speicher.belegt', { mb: formatiereZahl(belegt / BYTE_PRO_MB, sprache, 1) })}</p>
      )}
      {hinweis === 'ios_home' && <p class="speicher-hinweis">{t('speicher.hinweis_ios')}</p>}
      {hinweis === 'installieren' && <p class="speicher-hinweis">{t('speicher.hinweis_installieren')}</p>}
      {(hinweis === 'installieren' || hinweis === 'erneut') && (
        <button
          type="button"
          class="knopf knopf-breit panel-knopf"
          onClick={() => void fordereDauerhaftenSpeicher(navigator.storage).then(setSpeicher)}
        >
          {t('speicher.erneut')}
        </button>
      )}
    </Blatt>
  );
}
