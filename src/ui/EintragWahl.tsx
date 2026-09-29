import { useSprache } from '../i18n/kontext';
import { Blatt } from './Blatt';

interface Props {
  beiGps: () => void;
  beiTippen: () => void;
  beiSchliessen: () => void;
}

/** Wie soll der Baum eingetragen werden: per GPS am Baum oder per Tipp auf die Karte. */
export function EintragWahl({ beiGps, beiTippen, beiSchliessen }: Props) {
  const { t } = useSprache();
  return (
    <Blatt titel={t('baum.eintragen')} beiSchliessen={beiSchliessen}>
      <div class="wahl-liste">
        <button type="button" class="knopf knopf-primaer wahl-eintrag" onClick={beiGps}>
          <span>{t('eintragen.gps')}</span>
          <small>{t('eintragen.gps_text')}</small>
        </button>
        <button type="button" class="knopf wahl-eintrag" onClick={beiTippen}>
          <span>{t('eintragen.tippen')}</span>
          <small>{t('eintragen.tippen_text')}</small>
        </button>
      </div>
    </Blatt>
  );
}
