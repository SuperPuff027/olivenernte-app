import { useSprache } from '../i18n/kontext';
import { Blatt } from './Blatt';

interface Props {
  hatGrundstueck: boolean;
  beiSchliessen: () => void;
  beiGrenzeBearbeiten: () => void;
  beiOfflineKarte: () => void;
  beiSorten: () => void;
  beiImportDatei: (datei: File) => void;
}

export function Menue(props: Props) {
  const { hatGrundstueck, beiSchliessen, beiGrenzeBearbeiten, beiOfflineKarte, beiSorten, beiImportDatei } = props;
  const { t } = useSprache();
  return (
    <Blatt titel={t('menue.oeffnen')} beiSchliessen={beiSchliessen}>
      <div class="menue-eintraege">
        <button type="button" class="knopf knopf-breit" onClick={beiSorten}>
          {t('sorten.titel')}
        </button>
        <button type="button" class="knopf knopf-breit" onClick={beiGrenzeBearbeiten}>
          {t(hatGrundstueck ? 'grundstueck.bearbeiten' : 'grundstueck.zeichnen')}
        </button>
        <button type="button" class="knopf knopf-breit" onClick={beiOfflineKarte}>
          {t('offline.titel')}
        </button>
        {/* Label statt Button: öffnet die Dateiauswahl direkt aus der Nutzeraktion (nötig für iOS).
            Ohne accept-Filter, weil iOS .geojson sonst oft ausgraut; der Inhalt wird geprüft. */}
        <label class="knopf knopf-breit">
          {t('import.knopf')}
          <input
            type="file"
            class="versteckt"
            onChange={(e) => {
              const eingabe = e.currentTarget;
              const datei = eingabe.files?.[0];
              eingabe.value = ''; // dieselbe Datei erneut wählbar
              if (datei) beiImportDatei(datei);
            }}
          />
        </label>
      </div>
    </Blatt>
  );
}
