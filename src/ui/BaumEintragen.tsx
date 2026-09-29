import { useEffect, useRef, useState } from 'preact/hooks';
import { legeBaumAn, loescheBaum } from '../db/baeume';
import type { Schluessel } from '../i18n';
import { useSprache } from '../i18n/kontext';
import type { KartenSteuerung } from '../karte/kartenSteuerung';
import type { Baum } from '../model/typen';

interface Props {
  steuerung: KartenSteuerung;
  /** Bäume haben sich geändert: Karte neu zeichnen. */
  beiGeaendert: () => void;
  beiFertig: () => void;
  beiFehler: () => void;
}

interface Meldung {
  schluessel: Schluessel;
  nummer: string;
  warnung: boolean;
}

/** Modus „Baum eintragen“: jeder Tipp auf die Karte legt einen Baum an. */
export function BaumEintragen({ steuerung, beiGeaendert, beiFertig, beiFehler }: Props) {
  const { t } = useSprache();
  const [eingetragen, setEingetragen] = useState<Baum[]>([]);
  const [meldung, setMeldung] = useState<Meldung | null>(null);

  // Rückrufe über Ref, weil der Tippmodus sie nur einmal bekommt.
  const rueckrufe = useRef({ beiGeaendert, beiFehler });
  rueckrufe.current = { beiGeaendert, beiFehler };

  useEffect(() => {
    return steuerung.starteTippModus((punkt) => {
      legeBaumAn(punkt)
        .then(({ baum, ausserhalb }) => {
          setEingetragen((alt) => [...alt, baum]);
          setMeldung({
            schluessel: ausserhalb ? 'baum.ausserhalb' : 'baum.eingetragen',
            nummer: baum.nummer,
            warnung: ausserhalb,
          });
          rueckrufe.current.beiGeaendert();
        })
        .catch((e: unknown) => {
          console.error(e);
          rueckrufe.current.beiFehler();
        });
    });
  }, [steuerung]);

  async function rueckgaengig() {
    const letzter = eingetragen[eingetragen.length - 1];
    if (!letzter) return;
    try {
      await loescheBaum(letzter.id);
    } catch (e) {
      console.error(e);
      return beiFehler();
    }
    setEingetragen(eingetragen.slice(0, -1));
    setMeldung({ schluessel: 'baum.entfernt', nummer: letzter.nummer, warnung: false });
    beiGeaendert();
  }

  return (
    <>
      <div class="bearbeitung-kopf">
        <strong>{t('baum.eintragen')}</strong>
        <span>{t('baum.tippen_anleitung')}</span>
        <span>{t('baum.eingetragen_anzahl', { n: eingetragen.length })}</span>
        {meldung && (
          <span class={meldung.warnung ? 'bearbeitung-fehler' : undefined} role="status">
            {t(meldung.schluessel, { nummer: meldung.nummer })}
          </span>
        )}
      </div>

      <div class="bearbeitung-leiste">
        <div class="bearbeitung-zeile">
          <button type="button" class="knopf" onClick={() => void rueckgaengig()} disabled={eingetragen.length === 0}>
            {t('allgemein.rueckgaengig')}
          </button>
          <button type="button" class="knopf knopf-primaer" onClick={beiFertig}>
            {t('allgemein.fertig')}
          </button>
        </div>
      </div>
    </>
  );
}
