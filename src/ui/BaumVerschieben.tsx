import { useEffect, useRef, useState } from 'preact/hooks';
import { verschiebeBaum } from '../db/baeume';
import { useSprache } from '../i18n/kontext';
import type { KartenSteuerung } from '../karte/kartenSteuerung';
import type { NeuerBaum } from '../logic/baum';
import type { Baum, Position } from '../model/typen';

interface Props {
  baum: Baum;
  steuerung: KartenSteuerung;
  beiGespeichert: (ergebnis: NeuerBaum) => void;
  beiAbbrechen: () => void;
  beiFehler: () => void;
}

/** Modus „Position verschieben“: der Baum wird ein ziehbarer Punkt, gespeichert erst mit „Speichern“. */
export function BaumVerschieben({ baum, steuerung, beiGespeichert, beiAbbrechen, beiFehler }: Props) {
  const { t } = useSprache();
  const [punkt, setPunkt] = useState<Position | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const start: Position = [baum.lon, baum.lat];
    const beende = steuerung.verschiebeBaum(baum.id, start, setPunkt);
    if (panel.current) steuerung.haltePunktSichtbar(start, panel.current.offsetHeight);
    return beende;
  }, [steuerung, baum.id]);

  async function speichern() {
    if (!punkt || speichert) return;
    setSpeichert(true);
    try {
      const ergebnis = await verschiebeBaum(baum.id, punkt);
      if (ergebnis) beiGespeichert(ergebnis);
      else beiAbbrechen();
    } catch (e) {
      console.error(e);
      setSpeichert(false);
      beiFehler();
    }
  }

  return (
    <section class="panel" ref={panel} aria-label={t('baum.verschieben_titel', { nummer: baum.nummer })}>
      <header class="blatt-kopf">
        <h2>{t('baum.verschieben_titel', { nummer: baum.nummer })}</h2>
      </header>
      <div class="blatt-inhalt">
        <p class="panel-hilfe">{t('baum.verschieben_anleitung')}</p>
        <p class="panel-hilfe">{t('baum.verschieben_hinweis')}</p>
      </div>
      <footer class="blatt-aktionen">
        <button type="button" class="knopf" onClick={beiAbbrechen}>
          {t('allgemein.abbrechen')}
        </button>
        <button type="button" class="knopf knopf-primaer" disabled={!punkt || speichert} onClick={() => void speichern()}>
          {t('allgemein.speichern')}
        </button>
      </footer>
    </section>
  );
}
