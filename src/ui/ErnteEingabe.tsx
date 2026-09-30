import { useEffect, useRef, useState } from 'preact/hooks';
import { useSprache } from '../i18n/kontext';
import { lokalesDatum } from '../logic/ernte';
import { kgFuerEingabe, leseKg, MAX_KG_PRO_BAUM, type KgFehler } from '../logic/zahl';
import type { SaisonStatus } from '../model/typen';

interface Props {
  /** Saisonstatus vor der Eingabe (für Vorbelegung beim Ändern) */
  vorher: SaisonStatus | null;
  beiSpeichern: (kg: number | null, erntedatum: string) => void;
  beiAbbrechen: () => void;
}

/** Eingabe beim Markieren als geerntet: Menge in kg (oder ohne Menge) und Erntedatum. */
export function ErnteEingabe({ vorher, beiSpeichern, beiAbbrechen }: Props) {
  const { t, sprache } = useSprache();
  const heute = lokalesDatum(new Date());
  const warGeerntet = vorher?.status === 'geerntet';
  const [text, setText] = useState(() =>
    warGeerntet && vorher.ertrag_kg !== null ? kgFuerEingabe(vorher.ertrag_kg, sprache) : '',
  );
  const [datum, setDatum] = useState(() => (warGeerntet && vorher.erntedatum ? vorher.erntedatum : heute));
  const [fehler, setFehler] = useState<KgFehler | null>(null);
  const feld = useRef<HTMLInputElement>(null);
  // Direkt ins Mengenfeld (Android öffnet die Zifferntastatur; iOS erlaubt das nur nach einem Tipp ins Feld).
  useEffect(() => feld.current?.focus(), []);
  const gueltigesDatum = /^\d{4}-\d{2}-\d{2}$/.test(datum) && datum <= heute;

  function speichern(e: Event) {
    e.preventDefault();
    const ergebnis = leseKg(text, sprache);
    if (!ergebnis.ok) return setFehler(ergebnis.fehler);
    if (gueltigesDatum) beiSpeichern(ergebnis.kg, datum);
  }

  return (
    <form class="ernte-eingabe" onSubmit={speichern}>
      <label class="feld">
        <span>{t('ernte.ertrag')}</span>
        <input
          class="eingabe ernte-kg"
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          autocomplete="off"
          placeholder={t('ernte.menge_platzhalter')}
          value={text}
          ref={feld}
          onInput={(e) => {
            setText(e.currentTarget.value);
            setFehler(null);
          }}
        />
      </label>
      {fehler && (
        <p class="text-fehler" role="alert">
          {t(`ernte.fehler.${fehler}`, { max: MAX_KG_PRO_BAUM })}
        </p>
      )}
      <label class="feld">
        <span>{t('ernte.datum')}</span>
        <input
          class="eingabe"
          type="date"
          max={heute}
          value={datum}
          onInput={(e) => setDatum(e.currentTarget.value)}
        />
      </label>
      <div class="sorte-umbenennen-knoepfe">
        <button type="button" class="knopf" onClick={beiAbbrechen}>
          {t('allgemein.abbrechen')}
        </button>
        <button type="button" class="knopf" disabled={!gueltigesDatum} onClick={() => beiSpeichern(null, datum)}>
          {t('ernte.ohne_menge')}
        </button>
      </div>
      <button type="submit" class="knopf knopf-primaer knopf-breit" disabled={!gueltigesDatum}>
        {t('ernte.speichern')}
      </button>
    </form>
  );
}
