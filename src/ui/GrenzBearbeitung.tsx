import { useEffect, useRef, useState } from 'preact/hooks';
import { speichereGrundstueck } from '../db/grundstueck';
import { useSprache } from '../i18n/kontext';
import { starteGrenzEditor, type GrenzEditor } from '../karte/grenzEditor';
import type { KartenSteuerung } from '../karte/kartenSteuerung';
import { alsPolygon, entfernePunkt, fuegePunktEin, offenerRing, pruefeRing, verschiebePunkt } from '../logic/polygon';
import type { Grundstueck, Position } from '../model/typen';
import { GpsMessung } from './GpsMessung';

interface Props {
  steuerung: KartenSteuerung;
  grundstueck: Grundstueck | null;
  beiGespeichert: (grundstueck: Grundstueck) => void;
  beiAbbruch: () => void;
  beiFehler: () => void;
}

export function GrenzBearbeitung({ steuerung, grundstueck, beiGespeichert, beiAbbruch, beiFehler }: Props) {
  const { t } = useSprache();
  const [ring, setRing] = useState<Position[]>(() => (grundstueck ? offenerRing(grundstueck.polygon) : []));
  const [verlauf, setVerlauf] = useState<Position[][]>([]);
  const [ausgewaehlt, setAusgewaehlt] = useState<number | null>(null);
  const [speichert, setSpeichert] = useState(false);
  /** GPS-Messung läuft; ersetzt = Index des Punkts, der ersetzt wird (null = neuer Punkt) */
  const [messung, setMessung] = useState<{ ersetzt: number | null } | null>(null);
  const editor = useRef<GrenzEditor | null>(null);

  // Ringänderung mit Verlauf für „Rückgängig“; Rückrufe über Ref, weil der Editor sie einmal bekommt.
  const aendere = (neu: Position[]) => {
    setVerlauf((v) => [...v, ring]);
    setRing(neu);
    setAusgewaehlt(null);
  };
  const aktionen = useRef({ aendere, ring, setAusgewaehlt, misst: false });
  aktionen.current = { aendere, ring, setAusgewaehlt, misst: messung !== null };

  useEffect(() => {
    steuerung.zeigeGrundstueck(false);
    steuerung.beiGeladen(() => {
      editor.current = starteGrenzEditor(steuerung.karte, {
        // Während der GPS-Messung setzen Tipps keine Punkte.
        beiTipp: (p) => !aktionen.current.misst && aktionen.current.aendere(fuegePunktEin(aktionen.current.ring, p)),
        beiVerschieben: (i, p) => aktionen.current.aendere(verschiebePunkt(aktionen.current.ring, i, p)),
        beiAuswahl: (i) => !aktionen.current.misst && aktionen.current.setAusgewaehlt((alt) => (alt === i ? null : i)),
      });
      editor.current.zeige(aktionen.current.ring, null);
    });
    return () => {
      editor.current?.beende();
      editor.current = null;
      steuerung.zeigeGrundstueck(true);
    };
  }, [steuerung]);

  useEffect(() => {
    editor.current?.zeige(ring, ausgewaehlt);
  }, [ring, ausgewaehlt]);

  const fehler = pruefeRing(ring);
  const geaendert = verlauf.length > 0;

  function rueckgaengig() {
    const vorher = verlauf[verlauf.length - 1];
    if (!vorher) return;
    setVerlauf(verlauf.slice(0, -1));
    setRing(vorher);
    setAusgewaehlt(null);
  }

  function abbrechen() {
    if (!geaendert || confirm(t('grundstueck.verwerfen_frage'))) beiAbbruch();
  }

  async function speichern() {
    if (fehler || speichert) return;
    setSpeichert(true);
    try {
      beiGespeichert(await speichereGrundstueck(alsPolygon(ring), grundstueck, t('grundstueck.standard_name')));
    } catch (e) {
      console.error(e);
      setSpeichert(false);
      beiFehler();
    }
  }

  return (
    <>
      <div class="bearbeitung-kopf">
        <strong>{t(grundstueck ? 'grundstueck.bearbeiten' : 'grundstueck.zeichnen')}</strong>
        <span>{t('grundstueck.anleitung')}</span>
        <span class={fehler && ring.length > 0 ? 'bearbeitung-fehler' : undefined}>
          {t('grundstueck.punkte', { n: ring.length })}
          {fehler && ring.length > 0 && ` · ${t(`grundstueck.fehler.${fehler}`)}`}
        </span>
      </div>

      {messung && (
        <GpsMessung
          steuerung={steuerung}
          titel="grundstueck.gps_titel"
          anleitung="grundstueck.gps_anleitung"
          beiAbbrechen={() => setMessung(null)}
          beiUebernehmen={([lon, lat]) => {
            const punkt: Position = [lon, lat];
            setMessung(null);
            aendere(messung.ersetzt === null ? fuegePunktEin(ring, punkt) : verschiebePunkt(ring, messung.ersetzt, punkt));
          }}
        />
      )}

      <div class="bearbeitung-leiste" hidden={messung !== null}>
        <div class="bearbeitung-zeile">
          <button type="button" class="knopf" onClick={() => setMessung({ ersetzt: ausgewaehlt })}>
            {t(ausgewaehlt === null ? 'grundstueck.gps_punkt' : 'grundstueck.gps_punkt_verschieben')}
          </button>
        </div>
        <div class="bearbeitung-zeile">
          <button type="button" class="knopf" onClick={rueckgaengig} disabled={!geaendert}>
            {t('allgemein.rueckgaengig')}
          </button>
          <button
            type="button"
            class="knopf"
            onClick={() => ausgewaehlt !== null && aendere(entfernePunkt(ring, ausgewaehlt))}
            disabled={ausgewaehlt === null}
          >
            {t('grundstueck.punkt_loeschen')}
          </button>
        </div>
        <div class="bearbeitung-zeile">
          <button type="button" class="knopf" onClick={abbrechen}>
            {t('allgemein.abbrechen')}
          </button>
          <button
            type="button"
            class="knopf knopf-primaer"
            onClick={() => void speichern()}
            disabled={fehler !== null || speichert}
          >
            {t('allgemein.speichern')}
          </button>
        </div>
      </div>
    </>
  );
}
