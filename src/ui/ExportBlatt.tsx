import { useEffect, useState } from 'preact/hooks';
import { ladeExportDaten } from '../db/export';
import { useSprache } from '../i18n/kontext';
import { erstelleExport, exportDateiname } from '../logic/exportGeojson';
import { Blatt } from './Blatt';

interface Props {
  /** Aktuelle Saison (für die flachen Statusfelder im Export) */
  saison: number;
  beiSchliessen: () => void;
  beiFehler: () => void;
}

interface Vorbereitet {
  datei: File;
  baeume: number;
  sorten: number;
  saison: number;
}

// iOS teilt JSON-Dateien zuverlässiger mit diesem Typ als mit application/geo+json.
const DATEITYP = 'application/json';

function kannTeilen(datei: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [datei] });
}

function herunterladen(datei: File) {
  const url = URL.createObjectURL(datei);
  const link = document.createElement('a');
  link.href = url;
  link.download = datei.name;
  document.body.append(link);
  link.click();
  link.remove();
  // Etwas warten, sonst bricht mancher Browser den Download ab.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Export in zwei Schritten: erst die Datei vorbereiten, dann teilen. iOS erlaubt das
 * Teilen-Menü nur direkt nach einem Tipp; vorheriges Laden aus der Datenbank würde das verhindern.
 */
export function ExportBlatt({ saison, beiSchliessen, beiFehler }: Props) {
  const { t } = useSprache();
  const [vorbereitet, setVorbereitet] = useState<Vorbereitet | null>(null);

  useEffect(() => {
    void ladeExportDaten()
      .then((daten) => {
        const jetzt = new Date();
        const text = JSON.stringify(erstelleExport(daten, jetzt, saison), null, 2);
        setVorbereitet({
          datei: new File([text], exportDateiname(jetzt), { type: DATEITYP }),
          baeume: daten.baeume.length,
          sorten: daten.sorten.length,
          saison: daten.saisonStatus.length,
        });
      })
      .catch((e: unknown) => {
        console.error(e);
        beiFehler();
      });
  }, []);

  async function teilen(datei: File) {
    try {
      await navigator.share({ files: [datei], title: datei.name });
    } catch (e) {
      // Abbrechen im Teilen-Menü ist kein Fehler.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error(e);
      herunterladen(datei);
    }
  }

  return (
    <Blatt
      titel={t('export.titel')}
      beiSchliessen={beiSchliessen}
      aktionen={
        vorbereitet && (
          <>
            <button type="button" class="knopf" onClick={() => herunterladen(vorbereitet.datei)}>
              {t('export.herunterladen')}
            </button>
            {kannTeilen(vorbereitet.datei) && (
              <button type="button" class="knopf knopf-primaer" onClick={() => void teilen(vorbereitet.datei)}>
                {t('export.teilen')}
              </button>
            )}
          </>
        )
      }
    >
      <p>{t('export.beschreibung')}</p>
      {vorbereitet ? (
        <>
          <p>
            <strong>{t('export.datei', { datei: vorbereitet.datei.name })}</strong>
          </p>
          <p>{t('export.inhalt', { baeume: vorbereitet.baeume, sorten: vorbereitet.sorten, saison: vorbereitet.saison })}</p>
        </>
      ) : (
        <p>{t('export.bereite_vor')}</p>
      )}
      <p class="panel-hilfe">{t('export.tipp')}</p>
    </Blatt>
  );
}
