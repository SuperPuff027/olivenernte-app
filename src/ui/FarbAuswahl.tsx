import { useSprache } from '../i18n/kontext';
import { FARB_NAMEN, RINGFARBEN_VORSCHLAG } from '../logic/sorten';

interface Props {
  wert: string;
  beiWahl: (farbe: string) => void;
  beschriftung: string;
}

/** Palette der Ringfarben als große Knöpfe; jede Farbe mit Namen für Screenreader. */
export function FarbAuswahl({ wert, beiWahl, beschriftung }: Props) {
  const { t } = useSprache();
  return (
    <div class="farb-auswahl" role="radiogroup" aria-label={beschriftung}>
      {RINGFARBEN_VORSCHLAG.map((farbe) => {
        const gewaehlt = farbe === wert.toLowerCase();
        return (
          <button
            key={farbe}
            type="button"
            role="radio"
            aria-checked={gewaehlt}
            class="farb-feld"
            style={{ borderColor: farbe }}
            aria-label={t(`farbe.${FARB_NAMEN[farbe]}`)}
            title={t(`farbe.${FARB_NAMEN[farbe]}`)}
            onClick={() => beiWahl(farbe)}
          />
        );
      })}
    </div>
  );
}
