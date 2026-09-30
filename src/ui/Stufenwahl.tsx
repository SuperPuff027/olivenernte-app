import { useSprache } from '../i18n/kontext';
import { schritt, type Bereich } from '../logic/einstellungen';

/** Zahl mit großen −/+-Knöpfen (besser mit Handschuhen als ein Schieberegler). */
export function Stufenwahl(props: {
  beschriftung: string;
  wert: number;
  bereich: Bereich;
  anzeige: string;
  beiAenderung: (wert: number) => void;
}) {
  const { t } = useSprache();
  const { beschriftung, wert, bereich, anzeige, beiAenderung } = props;
  return (
    <div class="stufenwahl" role="group" aria-label={beschriftung}>
      <button
        type="button"
        class="knopf"
        disabled={wert <= bereich.min}
        aria-label={`${beschriftung}: ${t('einstellungen.weniger')}`}
        onClick={() => beiAenderung(schritt(wert, -1, bereich))}
      >
        −
      </button>
      <output class="stufenwahl-wert" aria-live="polite">
        {anzeige}
      </output>
      <button
        type="button"
        class="knopf"
        disabled={wert >= bereich.max}
        aria-label={`${beschriftung}: ${t('einstellungen.mehr')}`}
        onClick={() => beiAenderung(schritt(wert, 1, bereich))}
      >
        +
      </button>
    </div>
  );
}
