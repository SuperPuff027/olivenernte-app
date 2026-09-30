import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { legeBaumAn } from './db/baeume';
import { fuehreImportAus, ladeBestand } from './db/import';
import { ladeSaisonStatusJahr } from './db/repo';
import type { Platzhalter, Schluessel } from './i18n';
import { useSprache } from './i18n/kontext';
import { Karte } from './karte/Karte';
import type { KartenSteuerung } from './karte/kartenSteuerung';
import { bereichVon } from './logic/bereich';
import { neueId, saisonJahr } from './logic/datensatz';
import { aendereHain, ladeHain } from './db/repo';
import { baumPunkte, innenfarbe, RING_OHNE_SORTE } from './logic/farben';
import {
  erstelleMerkmale,
  istFilterAktiv,
  KEIN_FILTER,
  pruefeFilter,
  zaehleTreffer,
  type BaumFilter,
} from './logic/filter';
import { naechsteBaeume } from './logic/naechste';
import { formatiereMeter, formatiereZahl } from './logic/format';
import { leseGeojson, planeImport, type ImportPlan } from './logic/importGeojson';
import { zaehleBaeume } from './logic/statistik';
import type { Baum, Grundstueck, Position, SaisonStatus, Sorte } from './model/typen';
import { BaumEintragen } from './ui/BaumEintragen';
import { BaumPanel } from './ui/BaumPanel';
import { Einstellungen } from './ui/Einstellungen';
import { ExportBlatt } from './ui/ExportBlatt';
import { EintragWahl } from './ui/EintragWahl';
import { GpsMessung } from './ui/GpsMessung';
import { GrenzBearbeitung } from './ui/GrenzBearbeitung';
import { ImportVorschau } from './ui/ImportVorschau';
import { Menue } from './ui/Menue';
import { NaechsteBaeume } from './ui/NaechsteBaeume';
import { OfflineKarte } from './ui/OfflineKarte';
import { SortenVerwaltung } from './ui/SortenVerwaltung';
import { filterBeschreibung, standortFehlerText } from './ui/texte';
import { Uebersicht } from './ui/Uebersicht';

const HINWEIS_DAUER_MS = 6000;
/** Länge der Liste „Nächste passende Bäume“ */
const ANZAHL_NAECHSTE = 5;

// Der Filter übersteht einen Neustart (z. B. während der Ernte); nur auf diesem Gerät.
const FILTER_SCHLUESSEL = 'olivenernte.filter';

function ladeFilter(): BaumFilter {
  try {
    const roh = localStorage.getItem(FILTER_SCHLUESSEL);
    return roh ? pruefeFilter(JSON.parse(roh)) : KEIN_FILTER;
  } catch {
    return KEIN_FILTER;
  }
}

function speichereFilter(filter: BaumFilter) {
  try {
    if (istFilterAktiv(filter)) localStorage.setItem(FILTER_SCHLUESSEL, JSON.stringify(filter));
    else localStorage.removeItem(FILTER_SCHLUESSEL);
  } catch {
    // Merken ist nur Komfort.
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
  const [baumEintragen, setBaumEintragen] = useState(false);
  const [ausgewaehlt, setAusgewaehlt] = useState<string | null>(null);
  const [eintragWahl, setEintragWahl] = useState(false);
  const [gpsMessung, setGpsMessung] = useState(false);
  const [baumVerschieben, setBaumVerschieben] = useState(false);
  const [offlineOffen, setOfflineOffen] = useState(false);
  const [sortenOffen, setSortenOffen] = useState(false);
  const [einstellungenOffen, setEinstellungenOffen] = useState(false);
  const [exportOffen, setExportOffen] = useState(false);
  const [karteBereit, setKarteBereit] = useState(false);
  const [baeume, setBaeume] = useState<readonly Baum[]>([]);
  const [sorten, setSorten] = useState<readonly Sorte[]>([]);
  const [saisonStatus, setSaisonStatus] = useState<readonly SaisonStatus[]>([]);
  /** Aktuelle Saison aus den Hain-Einstellungen; bis zum Laden die vorgeschlagene. */
  const [saison, setSaison] = useState(() => saisonJahr(new Date()));
  /** Angezeigte ältere Saison; null = aktuelle Saison */
  const [ansichtSaison, setAnsichtSaison] = useState<number | null>(null);
  const ansichtRef = useRef<number | null>(null);
  ansichtRef.current = ansichtSaison;
  const gezeigteSaison = ansichtSaison ?? saison;
  const [filter, setFilter] = useState<BaumFilter>(ladeFilter);
  const [datenGeladen, setDatenGeladen] = useState(false);
  const [uebersichtOffen, setUebersichtOffen] = useState(false);
  const [naechsteOffen, setNaechsteOffen] = useState(false);
  const statistik = useMemo(
    () => zaehleBaeume(baeume, sorten, sprache, saisonStatus),
    [baeume, sorten, sprache, saisonStatus],
  );
  const merkmale = useMemo(() => erstelleMerkmale(sorten, saisonStatus), [sorten, saisonStatus]);
  const treffer = useMemo(
    () => zaehleTreffer(baeume, sorten, saisonStatus, filter),
    [baeume, sorten, saisonStatus, filter],
  );

  // Lädt alles, was die Karte zeigt, und reicht es an sie weiter.
  const ladeDaten = useCallback(async () => {
    const hain = await ladeHain();
    const jahr = ansichtRef.current ?? hain.aktuelle_saison;
    const [bestand, status] = await Promise.all([ladeBestand(), ladeSaisonStatusJahr(jahr)]);
    setSaison(hain.aktuelle_saison);
    const g = bestand.grundstuecke[0] ?? null;
    setGrundstueck(g);
    setBaeume(bestand.baeume);
    setSorten(bestand.sorten);
    setSaisonStatus(status);
    setDatenGeladen(true);
    steuerung.current?.setzeGrundstueck(g?.polygon ?? null);
  }, []);

  // Wird die gefilterte Sorte gelöscht, gilt dieser Teil des Filters nicht mehr.
  const filterSorteId = filter.sorte?.sorteId ?? null;
  const filterSorte = filterSorteId ? sorten.find((s) => s.id === filterSorteId && !s.geloescht) : undefined;
  useEffect(() => {
    // Erst nach dem Laden prüfen, sonst ginge ein gemerkter Sortenfilter beim Start verloren.
    if (datenGeladen && filterSorteId && !filterSorte) setFilter((f) => ({ ...f, sorte: null }));
  }, [datenGeladen, filterSorteId, filterSorte]);

  useEffect(() => speichereFilter(filter), [filter]);

  useEffect(() => {
    if (karteBereit) steuerung.current?.setzeBaeume(baumPunkte(baeume, sorten, saisonStatus, filter));
  }, [karteBereit, baeume, sorten, saisonStatus, filter]);

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

  // Tipp auf einen Baum öffnet das Panel, Tipp daneben schließt es; nicht in Bearbeitungsmodi.
  const modusAktiv = useRef(false);
  modusAktiv.current = grenzeBearbeiten || baumEintragen || gpsMessung || baumVerschieben;
  useEffect(() => {
    if (!karteBereit) return;
    steuerung.current?.beiBaumTipp((id) => {
      if (!modusAktiv.current) setAusgewaehlt(id);
    });
  }, [karteBereit]);
  useEffect(() => {
    steuerung.current?.markiereBaum(ausgewaehlt);
  }, [ausgewaehlt, karteBereit]);

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

  const neuLaden = useCallback(() => void ladeDaten().catch(console.error), [ladeDaten]);

  // Andere Saison angezeigt: deren Status laden. Ein offenes Baum-Panel gehört zur vorigen Saison.
  useEffect(() => {
    setAusgewaehlt(null);
    if (karteBereit) neuLaden();
  }, [ansichtSaison]);

  /** Neue Saison beginnen (oder bei einem Versehen zurück); alte Saisons bleiben unverändert. */
  async function wechsleSaison(neu: number) {
    try {
      await aendereHain({ aktuelle_saison: neu });
      setAnsichtSaison(null);
      ansichtRef.current = null;
      setHinweis({ schluessel: 'saison.gewechselt', platzhalter: { jahr: neu }, art: 'info' });
      await ladeDaten();
    } catch (e) {
      console.error(e);
      fehler('einstellungen.fehler');
    }
  }

  /** Karte auf den Baum und sein Panel öffnen. */
  function oeffneBaum(baum: Baum) {
    steuerung.current?.zeigeBaum([baum.lon, baum.lat]);
    setAusgewaehlt(baum.id);
  }

  /** Vom gerade bearbeiteten Baum zum nächsten passenden (ohne GPS). */
  function naechsterBaum(von: Baum) {
    const [naechster] = naechsteBaeume(von, baeume, merkmale, filter, 1, von.id);
    if (naechster) oeffneBaum(naechster.baum);
    else setHinweis({ schluessel: 'naechste.kein_weiterer', art: 'info' });
  }

  async function gpsUebernehmen(punkt: Position, genauigkeit_m: number) {
    setGpsMessung(false);
    try {
      const { baum, ausserhalb } = await legeBaumAn(punkt, genauigkeit_m);
      setHinweis(
        ausserhalb
          ? { schluessel: 'baum.ausserhalb', platzhalter: { nummer: baum.nummer }, art: 'fehler' }
          : {
              schluessel: 'gps.eingetragen',
              platzhalter: { nummer: baum.nummer, genauigkeit: formatiereMeter(genauigkeit_m, sprache) },
              art: 'info',
            },
      );
      await ladeDaten();
      // Direkt das Panel öffnen, damit Sorte und Status gleich am Baum gesetzt werden können.
      setAusgewaehlt(baum.id);
    } catch (e) {
      console.error(e);
      fehler('baum.fehler.speichern');
    }
  }
  const modus = grenzeBearbeiten ? 'app app-bearbeitung' : baumEintragen ? 'app app-bearbeitung-einzeilig' : 'app';

  return (
    <main class={modus}>
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

      {!grenzeBearbeiten && !baumEintragen && !gpsMessung && (
        <div class="zaehler">
          {ansichtSaison !== null && (
            <div class="saison-ansicht" role="status">
              <span>{t('saison.ansicht', { jahr: ansichtSaison })}</span>
              <button type="button" class="knopf" onClick={() => setAnsichtSaison(null)}>
                {t('saison.ansicht_zurueck', { jahr: saison })}
              </button>
            </div>
          )}
          <button
            type="button"
            class="knopf"
            onClick={() => setUebersichtOffen(true)}
            aria-label={t('statistik.oeffnen', { n: statistik.gesamt })}
          >
            {t('statistik.knopf', { n: formatiereZahl(statistik.gesamt, sprache) })}
          </button>
          <button type="button" class="knopf" onClick={() => setNaechsteOffen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="M12 5l3 8h-6z" fill="currentColor" />
              <path d="M12 19l-3-6h6z" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
            <span>{t('naechste.knopf')}</span>
          </button>
          {istFilterAktiv(filter) && (
            <span class="filter-anzeige">
              <button type="button" class="filter-oeffnen" onClick={() => setUebersichtOffen(true)}>
                {filter.status && (
                  <span class="status-punkt" style={{ background: innenfarbe(filter.status) }} aria-hidden="true" />
                )}
                {filter.sorte && (
                  <span
                    class="sorte-punkt"
                    style={{ borderColor: filterSorte?.ringfarbe ?? RING_OHNE_SORTE }}
                    aria-hidden="true"
                  />
                )}
                <span class="filter-name">
                  {filterBeschreibung(filter, filterSorte?.name ?? null, t)} ({formatiereZahl(treffer, sprache)})
                </span>
              </button>
              <button
                type="button"
                class="knopf knopf-schliessen"
                onClick={() => setFilter(KEIN_FILTER)}
                aria-label={t('filter.aufheben')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}

      {!grenzeBearbeiten && !baumEintragen && !gpsMessung && !ausgewaehlt && (
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
            onClick={() => {
              setHinweis(null);
              setEintragWahl(true);
            }}
            aria-label={t('baum.eintragen')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
              <path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <span class="knopf-text-optional">{t('baum.eintragen')}</span>
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

      {ausgewaehlt && steuerung.current && (
        <BaumPanel
          key={ausgewaehlt}
          baumId={ausgewaehlt}
          saison={gezeigteSaison}
          steuerung={steuerung.current}
          beiSchliessen={() => setAusgewaehlt(null)}
          beiGeaendert={neuLaden}
          beiGeloescht={(nummer) => {
            setAusgewaehlt(null);
            setHinweis({ schluessel: 'baum.geloescht', platzhalter: { nummer }, art: 'info' });
            neuLaden();
          }}
          beiFehler={() => fehler('baum.fehler.speichern')}
          beiVerschiebeModus={setBaumVerschieben}
          beiNaechsterBaum={naechsterBaum}
        />
      )}

      {eintragWahl && (
        <EintragWahl
          beiGps={() => {
            setEintragWahl(false);
            setGpsMessung(true);
          }}
          beiTippen={() => {
            setEintragWahl(false);
            setBaumEintragen(true);
          }}
          beiSchliessen={() => setEintragWahl(false)}
        />
      )}

      {gpsMessung && steuerung.current && (
        <GpsMessung
          steuerung={steuerung.current}
          beiUebernehmen={(punkt, genauigkeit) => void gpsUebernehmen(punkt, genauigkeit)}
          beiAbbrechen={() => setGpsMessung(false)}
        />
      )}

      {baumEintragen && steuerung.current && (
        <BaumEintragen
          steuerung={steuerung.current}
          beiGeaendert={neuLaden}
          beiFertig={() => setBaumEintragen(false)}
          beiFehler={() => fehler('baum.fehler.speichern')}
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
          beiSorten={() => {
            setMenueOffen(false);
            setSortenOffen(true);
          }}
          beiOfflineKarte={() => {
            setMenueOffen(false);
            setOfflineOffen(true);
          }}
          beiEinstellungen={() => {
            setMenueOffen(false);
            setEinstellungenOffen(true);
          }}
          beiExport={() => {
            setMenueOffen(false);
            setExportOffen(true);
          }}
          beiImportDatei={(d) =>
            importDateiGewaehlt(d).catch((e) => {
              console.error(e);
              fehler('import.fehler.lesen');
            })
          }
        />
      )}

      {sortenOffen && (
        <SortenVerwaltung
          beiSchliessen={() => setSortenOffen(false)}
          beiGeaendert={neuLaden}
          beiFehler={() => fehler('sorten.fehler.speichern')}
        />
      )}

      {naechsteOffen && (
        <NaechsteBaeume
          filterText={istFilterAktiv(filter) ? filterBeschreibung(filter, filterSorte?.name ?? null, t) : null}
          sorten={sorten}
          merkmale={merkmale}
          suche={(standort) => naechsteBaeume(standort, baeume, merkmale, filter, ANZAHL_NAECHSTE)}
          beiWahl={(baum) => {
            setNaechsteOffen(false);
            oeffneBaum(baum);
          }}
          beiSchliessen={() => setNaechsteOffen(false)}
        />
      )}

      {uebersichtOffen && (
        <Uebersicht
          statistik={statistik}
          saison={saison}
          gezeigteSaison={gezeigteSaison}
          beiSaisonAnsicht={(jahr) => setAnsichtSaison(jahr === saison ? null : jahr)}
          beiNeueSaison={() => {
            if (confirm(t('saison.neu_frage', { neu: saison + 1, alt: saison }))) {
              setUebersichtOffen(false);
              void wechsleSaison(saison + 1);
            }
          }}
          filter={filter}
          beiFilter={(f, schliessen) => {
            setFilter(f);
            if (schliessen) setUebersichtOffen(false);
          }}
          beiSchliessen={() => setUebersichtOffen(false)}
        />
      )}

      {exportOffen && (
        <ExportBlatt saison={saison} beiSchliessen={() => setExportOffen(false)} beiFehler={() => fehler('export.fehler')} />
      )}

      {einstellungenOffen && (
        <Einstellungen
          saison={saison}
          beiSaisonWechsel={(neu) => void wechsleSaison(neu)}
          beiSchliessen={() => setEinstellungenOffen(false)}
          beiFehler={() => fehler('einstellungen.fehler')}
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
