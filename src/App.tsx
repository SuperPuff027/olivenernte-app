import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { ladeGrundstueck } from './db/grundstueck';
import { fuehreImportAus, ladeBestand } from './db/import';
import type { Platzhalter, Schluessel } from './i18n';
import { useSprache } from './i18n/kontext';
import { Karte } from './karte/Karte';
import type { KartenSteuerung } from './karte/kartenSteuerung';
import { bereichVon } from './logic/bereich';
import { neueId } from './logic/datensatz';
import { leseGeojson, planeImport, type ImportPlan } from './logic/importGeojson';
import type { Grundstueck } from './model/typen';
import { GrenzBearbeitung } from './ui/GrenzBearbeitung';
import { ImportVorschau } from './ui/ImportVorschau';
import { Menue } from './ui/Menue';
import { OfflineKarte } from './ui/OfflineKarte';

const HINWEIS_DAUER_MS = 6000;

// Fehlercodes der Geolocation-API
const ZUGRIFF_VERWEIGERT = 1;
const ZEITUEBERSCHREITUNG = 3;

function standortFehlerText(code: number): Schluessel {
  switch (code) {
    case ZUGRIFF_VERWEIGERT:
      return 'standort.fehler.verweigert';
    case ZEITUEBERSCHREITUNG:
      return 'standort.fehler.zeitueberschreitung';
    default:
      return 'standort.fehler.nicht_verfuegbar';
  }
}

interface Hinweis {
  schluessel: Schluessel;
  platzhalter?: Platzhalter;
  art: 'fehler' | 'info';
}

async function zeigeAlles(steuerung: KartenSteuerung, animiert: boolean) {
  const bestand = await ladeBestand();
  const bereich = bereichVon(bestand.grundstuecke[0] ?? null, bestand.baeume);
  if (bereich) steuerung.zeigeBereich(bereich, animiert);
}

export function App() {
  const { t, sprache } = useSprache();
  const steuerung = useRef<KartenSteuerung | null>(null);
  const [hinweis, setHinweis] = useState<Hinweis | null>(null);
  const [menueOffen, setMenueOffen] = useState(false);
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [grundstueck, setGrundstueck] = useState<Grundstueck | null>(null);
  const [grenzeBearbeiten, setGrenzeBearbeiten] = useState(false);
  const [offlineOffen, setOfflineOffen] = useState(false);
  const [karteBereit, setKarteBereit] = useState(false);

  const ladeDaten = useCallback(async () => {
    const g = await ladeGrundstueck();
    setGrundstueck(g);
    steuerung.current?.setzeGrundstueck(g?.polygon ?? null);
  }, []);

  useEffect(() => {
    if (!hinweis) return;
    const zeitgeber = setTimeout(() => setHinweis(null), HINWEIS_DAUER_MS);
    return () => clearTimeout(zeitgeber);
  }, [hinweis]);

  const fehler = (schluessel: Schluessel) => setHinweis({ schluessel, art: 'fehler' });

  const beiBereit = useCallback((s: KartenSteuerung) => {
    steuerung.current = s;
    setKarteBereit(true);
    // Beim allerersten Start (noch kein Kartenausschnitt gespeichert) auf das Grundstück zoomen.
    if (!s.hatteGespeicherteAnsicht) void zeigeAlles(s, false).catch(console.error);
  }, []);
  useEffect(() => {
    if (karteBereit) void ladeDaten().catch(console.error);
  }, [karteBereit, ladeDaten]);

  const beiStandortFehler = useCallback(
    (code: number) => setHinweis({ schluessel: standortFehlerText(code), art: 'fehler' }),
    [],
  );

  async function importDateiGewaehlt(datei: File) {
    setMenueOffen(false);
    let text: string;
    try {
      text = await datei.text();
    } catch {
      return fehler('import.fehler.lesen');
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return fehler('import.fehler.kein_geojson');
    }
    const gelesen = leseGeojson(json);
    if (!gelesen.ok) return fehler(`import.fehler.${gelesen.fehler}`);
    setImportPlan(planeImport(gelesen.daten, await ladeBestand(), new Date(), neueId, sprache));
  }

  async function importAusfuehren(plan: ImportPlan) {
    setImportPlan(null);
    try {
      await fuehreImportAus(plan);
    } catch (e) {
      console.error(e);
      return fehler('import.fehler.speichern');
    }
    setHinweis({ schluessel: 'import.fertig', art: 'info' });
    await ladeDaten();
    if (steuerung.current) await zeigeAlles(steuerung.current, true);
  }

  return (
    <main class={grenzeBearbeiten ? 'app app-bearbeitung' : 'app'}>
      <Karte beiBereit={beiBereit} beiStandortFehler={beiStandortFehler} />

      {hinweis && (
        <div
          class={`hinweis hinweis-${hinweis.art}`}
          role={hinweis.art === 'fehler' ? 'alert' : 'status'}
          onClick={() => setHinweis(null)}
        >
          {t(hinweis.schluessel, hinweis.platzhalter)}
        </div>
      )}

      {!grenzeBearbeiten && (
        <nav class="leiste">
          <button type="button" class="knopf" onClick={() => setMenueOffen(true)} aria-label={t('menue.oeffnen')}>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
            </svg>
            <span>{t('menue.oeffnen')}</span>
          </button>
          <button
            type="button"
            class="knopf"
            onClick={() => steuerung.current?.zeigeStandort()}
            aria-label={t('standort.zeigen')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="2" />
            </svg>
            <span>{t('standort.zeigen')}</span>
          </button>
        </nav>
      )}

      {grenzeBearbeiten && steuerung.current && (
        <GrenzBearbeitung
          steuerung={steuerung.current}
          grundstueck={grundstueck}
          beiGespeichert={(g) => {
            setGrenzeBearbeiten(false);
            setGrundstueck(g);
            steuerung.current?.setzeGrundstueck(g.polygon);
            setHinweis({ schluessel: 'grundstueck.gespeichert', art: 'info' });
          }}
          beiAbbruch={() => setGrenzeBearbeiten(false)}
          beiFehler={() => fehler('grundstueck.fehler.speichern')}
        />
      )}

      {menueOffen && (
        <Menue
          hatGrundstueck={grundstueck !== null}
          beiSchliessen={() => setMenueOffen(false)}
          beiGrenzeBearbeiten={() => {
            setMenueOffen(false);
            setHinweis(null);
            setGrenzeBearbeiten(true);
          }}
          beiOfflineKarte={() => {
            setMenueOffen(false);
            setOfflineOffen(true);
          }}
          beiImportDatei={(d) =>
            importDateiGewaehlt(d).catch((e) => {
              console.error(e);
              fehler('import.fehler.lesen');
            })
          }
        />
      )}

      {offlineOffen && <OfflineKarte beiSchliessen={() => setOfflineOffen(false)} />}

      {importPlan && (
        <ImportVorschau
          plan={importPlan}
          beiBestaetigen={() => void importAusfuehren(importPlan)}
          beiAbbrechen={() => setImportPlan(null)}
        />
      )}
    </main>
  );
}
