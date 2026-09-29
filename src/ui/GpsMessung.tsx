import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ladeEinstellungen } from '../db/repo';
import type { Schluessel } from '../i18n';
import { useSprache } from '../i18n/kontext';
import type { KartenSteuerung } from '../karte/kartenSteuerung';
import { STANDARD_ZIEL_GPS_GENAUIGKEIT_M } from '../logic/datensatz';
import { formatiereMeter } from '../logic/format';
import { MIN_FIXES, mittele, zielErreicht, type GpsFix } from '../logic/gpsMittel';
import type { Position } from '../model/typen';

interface Props {
  steuerung: KartenSteuerung;
  beiUebernehmen: (punkt: Position, genauigkeit_m: number) => void;
  beiAbbrechen: () => void;
}

// Fehlercodes der Geolocation-API
const ZUGRIFF_VERWEIGERT = 1;
const ZEITUEBERSCHREITUNG = 3;
/** Ohne Fix in dieser Zeit kommt ein Hinweis; die Messung läuft weiter. */
const SIGNAL_WARTEZEIT_MS = 20_000;

function dauerText(ms: number): string {
  const sekunden = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`;
}

/** „Baum hier eintragen“: sammelt GPS-Fixes und mittelt sie, bis die Zielgenauigkeit erreicht ist. */
export function GpsMessung({ steuerung, beiUebernehmen, beiAbbrechen }: Props) {
  const { t, sprache } = useSprache();
  const [ziel, setZiel] = useState(STANDARD_ZIEL_GPS_GENAUIGKEIT_M);
  const [fixes, setFixes] = useState<GpsFix[]>([]);
  const [fehler, setFehler] = useState<Schluessel | null>(null);
  const [ende, setEnde] = useState<number | null>(null);
  const beendet = ende !== null;
  const [start] = useState(() => Date.now());
  const [jetzt, setJetzt] = useState(start);
  const panel = useRef<HTMLElement>(null);
  const beobachtung = useRef<number | null>(null);

  const mittel = useMemo(() => mittele(fixes), [fixes]);
  const erreicht = zielErreicht(mittel, ziel);

  const stoppe = () => {
    if (beobachtung.current !== null) navigator.geolocation.clearWatch(beobachtung.current);
    beobachtung.current = null;
  };

  useEffect(() => {
    void ladeEinstellungen()
      .then((e) => setZiel(e.ziel_gps_genauigkeit_m))
      .catch(console.error);
    if (!('geolocation' in navigator)) {
      setFehler('gps.nicht_unterstuetzt');
      return;
    }
    beobachtung.current = navigator.geolocation.watchPosition(
      (p) => {
        setFehler(null);
        setFixes((alt) => [
          ...alt,
          { lat: p.coords.latitude, lon: p.coords.longitude, genauigkeit_m: p.coords.accuracy, zeit_ms: p.timestamp },
        ]);
      },
      (e) => {
        if (e.code === ZUGRIFF_VERWEIGERT) {
          stoppe();
          setFehler('standort.fehler.verweigert');
        } else {
          setFehler(e.code === ZEITUEBERSCHREITUNG ? 'gps.kein_signal' : 'standort.fehler.nicht_verfuegbar');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: SIGNAL_WARTEZEIT_MS },
    );
    const uhr = setInterval(() => setJetzt(Date.now()), 1000);
    return () => {
      stoppe();
      clearInterval(uhr);
      steuerung.zeigeMesspunkt(null);
    };
  }, [steuerung]);

  // Ziel erreicht: Messung beenden, das Ergebnis bleibt bis zum Übernehmen stehen.
  useEffect(() => {
    if (erreicht && !beendet) {
      stoppe();
      setEnde(Date.now());
    }
  }, [erreicht, beendet]);

  const punkt = mittel.punkt;
  useEffect(() => {
    if (!punkt) return;
    steuerung.zeigeMesspunkt([punkt.lon, punkt.lat]);
    if (panel.current) steuerung.haltePunktSichtbar([punkt.lon, punkt.lat], panel.current.offsetHeight);
  }, [punkt, steuerung]);

  const meter = (m: number) => formatiereMeter(m, sprache);

  return (
    <section class="panel" ref={panel} aria-label={t('gps.titel')}>
      <header class="blatt-kopf">
        <h2>{t('gps.titel')}</h2>
      </header>
      <div class="blatt-inhalt" role="status">
        <p class="panel-hilfe">{t('gps.anleitung')}</p>
        <p class="gps-wert">
          {mittel.genauigkeit_m === null ? t('gps.warte') : t('gps.genauigkeit', { wert: meter(mittel.genauigkeit_m) })}
        </p>
        <p class="panel-hilfe">
          {t('gps.ziel', { wert: meter(ziel) })}
          {' · '}
          {t('gps.messungen', {
            n: mittel.verwendet,
            verworfen: mittel.verworfen,
            dauer: dauerText((ende ?? jetzt) - start),
          })}
        </p>
        {beendet && <p class="gps-erreicht">{t('gps.ziel_erreicht')}</p>}
        {!beendet && punkt && mittel.genauigkeit_m !== null && (
          <p class="panel-hilfe">
            {mittel.genauigkeit_m > ziel
              ? t('gps.frueh_uebernehmen')
              : t('gps.noch_messungen', { n: Math.max(1, MIN_FIXES - mittel.verwendet) })}
          </p>
        )}
        {fehler && <p class="text-fehler">{t(fehler)}</p>}
      </div>
      <footer class="blatt-aktionen">
        <button type="button" class="knopf" onClick={beiAbbrechen}>
          {t('allgemein.abbrechen')}
        </button>
        <button
          type="button"
          class="knopf knopf-primaer"
          disabled={!punkt || mittel.genauigkeit_m === null}
          onClick={() => {
            if (!punkt || mittel.genauigkeit_m === null) return;
            stoppe();
            beiUebernehmen([punkt.lon, punkt.lat], mittel.genauigkeit_m);
          }}
        >
          {t('gps.uebernehmen')}
        </button>
      </footer>
    </section>
  );
}
