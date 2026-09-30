import { useEffect, useState } from 'preact/hooks';
import { ladeExportDaten } from '../db/export';
import { useSprache } from '../i18n/kontext';
import { BAUM_SPALTEN, baumZeilen, csvDateiname, csvText, ERNTE_SPALTEN, ernteZeilen } from '../logic/csv';
import { erstelleExport, exportDateiname } from '../logic/exportGeojson';
import type { ErnteStatus } from '../model/typen';
import { Blatt } from './Blatt';

interface Props {
  /** Aktuelle Saison (Statusfelder im GeoJSON und in der Baumliste) */
  saison: number;
  beiSchliessen: () => void;
  beiFehler: () => void;
}

interface Vorbereitet {
  geojson: File;
  /** Baumliste und Ernte-Historie für Tabellenprogramme */
  csv: File[];
  baeume: number;
  sorten: number;
  saison: number;
}

// iOS teilt JSON-Dateien zuverlässiger mit diesem Typ als mit application/geo+json.
const GEOJSON_TYP = 'application/json';
const CSV_TYP = 'text/csv';

function kannTeilen(dateien: File[]): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: dateien });
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
 * Export in zwei Schritten: erst die Dateien vorbereiten, dann teilen. iOS erlaubt das
 * Teilen-Menü nur direkt nach einem Tipp; vorheriges Laden aus der Datenbank würde das verhindern.
 */
export function ExportBlatt({ saison, beiSchliessen, beiFehler }: Props) {
  const { t, sprache } = useSprache();
  const [vorbereitet, setVorbereitet] = useState<Vorbereitet | null>(null);

  useEffect(() => {
    void ladeExportDaten()
      .then((daten) => {
        const jetzt = new Date();
        const geojson = JSON.stringify(erstelleExport(daten, jetzt, saison), null, 2);
        const statusText = (s: ErnteStatus) => t(`status.${s}`);
        const baumCsv = csvText(
          BAUM_SPALTEN.map((s) => t(`csv.baum.${s}`, { saison })),
          baumZeilen(daten, saison, statusText),
          sprache,
        );
        const ernteCsv = csvText(
          ERNTE_SPALTEN.map((s) => t(`csv.ernte.${s}`)),
          ernteZeilen(daten, statusText),
          sprache,
        );
        setVorbereitet({
          geojson: new File([geojson], exportDateiname(jetzt), { type: GEOJSON_TYP }),
          csv: [
            new File([baumCsv], csvDateiname('baeume', jetzt), { type: CSV_TYP }),
            new File([ernteCsv], csvDateiname('ernte', jetzt), { type: CSV_TYP }),
          ],
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

  async function teilen(dateien: File[]) {
    try {
      await navigator.share({ files: dateien, title: dateien.map((d) => d.name).join(', ') });
    } catch (e) {
      // Abbrechen im Teilen-Menü ist kein Fehler.
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error(e);
      dateien.forEach(herunterladen);
    }
  }

  const knoepfe = (dateien: File[]) => (
    <div class="sorte-umbenennen-knoepfe export-knoepfe">
      <button type="button" class="knopf" onClick={() => dateien.forEach(herunterladen)}>
        {t('export.herunterladen')}
      </button>
      {kannTeilen(dateien) && (
        <button type="button" class="knopf knopf-primaer" onClick={() => void teilen(dateien)}>
          {t('export.teilen')}
        </button>
      )}
    </div>
  );

  return (
    <Blatt titel={t('export.titel')} beiSchliessen={beiSchliessen}>
      {!vorbereitet && <p>{t('export.bereite_vor')}</p>}
      {vorbereitet && (
        <>
          <p>{t('export.inhalt', { baeume: vorbereitet.baeume, sorten: vorbereitet.sorten, saison: vorbereitet.saison })}</p>

          <h3>{t('export.geojson_titel')}</h3>
          <p>{t('export.beschreibung')}</p>
          <p>
            <strong>{t('export.datei', { datei: vorbereitet.geojson.name })}</strong>
          </p>
          {knoepfe([vorbereitet.geojson])}

          <h3>{t('export.csv_titel')}</h3>
          <p>{t('export.csv_beschreibung', { saison })}</p>
          <ul class="liste">
            {vorbereitet.csv.map((d) => (
              <li key={d.name}>
                <strong>{d.name}</strong>
              </li>
            ))}
          </ul>
          {knoepfe(vorbereitet.csv)}
        </>
      )}
      <p class="panel-hilfe">{t('export.tipp')}</p>
    </Blatt>
  );
}
