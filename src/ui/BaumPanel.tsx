import { useEffect, useRef, useState } from 'preact/hooks';
import { aendereBaum, ladeBaum, loescheBaum, type BaumAenderung } from '../db/baeume';
import { ladeBestand } from '../db/import';
import { aendereSaisonStatus, ladeEinstellungen, ladeSaisonStatus, type SaisonAenderung } from '../db/repo';
import { useSprache } from '../i18n/kontext';
import type { KartenSteuerung } from '../karte/kartenSteuerung';
import { fuellstandOptionen, letzteAenderung } from '../logic/baum';
import { saisonJahr, STANDARD_FUELLSTAND_MAX } from '../logic/datensatz';
import { STANDARD_STATUS } from '../logic/farben';
import { formatiereGrad, formatiereMeter, formatiereZeitpunkt } from '../logic/format';
import { normiereNummer, pruefeNummer, type NummernFehler } from '../logic/nummern';
import { sortiereSorten } from '../logic/sorten';
import { ERNTE_STATUS, type Baum, type SaisonStatus, type Sorte } from '../model/typen';

interface Props {
  baumId: string;
  steuerung: KartenSteuerung;
  beiSchliessen: () => void;
  /** Nach jeder gespeicherten Änderung, damit die Karte neu zeichnet. */
  beiGeaendert: () => void;
  beiGeloescht: (nummer: string) => void;
  beiFehler: () => void;
}

const OHNE_SORTE = '';
/** Notiz wird kurz nach dem letzten Tastendruck gespeichert (und sofort beim Verlassen des Felds). */
const NOTIZ_VERZOEGERUNG_MS = 600;

/**
 * Panel eines Baums: zeigt alle Werte und speichert jede Änderung sofort.
 * Nicht modal: die Karte darüber bleibt bedienbar (anderer Baum antippen wechselt).
 */
export function BaumPanel({ baumId, steuerung, beiSchliessen, beiGeaendert, beiGeloescht, beiFehler }: Props) {
  const { t, sprache } = useSprache();
  const jahr = saisonJahr(new Date());
  const [baum, setBaum] = useState<Baum | null>(null);
  const [status, setStatus] = useState<SaisonStatus | null>(null);
  const [sorten, setSorten] = useState<Sorte[]>([]);
  const [baeume, setBaeume] = useState<readonly Baum[]>([]);
  const [fuellstandMax, setFuellstandMax] = useState(STANDARD_FUELLSTAND_MAX);
  const [nummer, setNummer] = useState('');
  const [nummerFehler, setNummerFehler] = useState<NummernFehler | null>(null);
  const [notiz, setNotiz] = useState('');
  const panel = useRef<HTMLElement>(null);
  const notizZeitgeber = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offeneNotiz = useRef<string | null>(null);

  useEffect(() => {
    let aktiv = true;
    void (async () => {
      const [b, s, bestand, einstellungen] = await Promise.all([
        ladeBaum(baumId),
        ladeSaisonStatus(baumId, jahr),
        ladeBestand(),
        ladeEinstellungen(),
      ]);
      if (!aktiv) return;
      if (!b) return beiSchliessen();
      setBaum(b);
      setStatus(s);
      setSorten(sortiereSorten(bestand.sorten, sprache));
      setBaeume(bestand.baeume);
      setFuellstandMax(einstellungen.fuellstand_max);
      setNummer(b.nummer);
      setNotiz(b.notiz);
    })().catch((e: unknown) => {
      console.error(e);
      beiFehler();
    });
    return () => {
      aktiv = false;
    };
    // Nur beim Öffnen laden; das Panel wird pro Baum neu erzeugt (key).
  }, []);

  // Den Baum oberhalb des Panels sichtbar halten.
  useEffect(() => {
    if (baum && panel.current) steuerung.haltePunktSichtbar([baum.lon, baum.lat], panel.current.offsetHeight);
  }, [baum?.id]);

  // Beim Schließen oder Wechseln eine noch nicht gespeicherte Notiz sichern.
  useEffect(
    () => () => {
      if (notizZeitgeber.current) clearTimeout(notizZeitgeber.current);
      const offen = offeneNotiz.current;
      if (offen !== null) void speichereBaum({ notiz: offen });
    },
    [],
  );

  async function speichereBaum(aenderung: BaumAenderung) {
    try {
      const ergebnis = await aendereBaum(baumId, aenderung, sprache);
      if (!ergebnis.ok) {
        if (ergebnis.fehler === 'nicht_gefunden') beiSchliessen();
        else setNummerFehler(ergebnis.fehler);
        return;
      }
      setBaum(ergebnis.baum);
      setBaeume((alt) => alt.map((b) => (b.id === baumId ? ergebnis.baum : b)));
      beiGeaendert();
    } catch (e) {
      console.error(e);
      beiFehler();
    }
  }

  async function speichereSaison(aenderung: SaisonAenderung) {
    try {
      setStatus(await aendereSaisonStatus(baumId, jahr, aenderung));
      beiGeaendert();
    } catch (e) {
      console.error(e);
      beiFehler();
    }
  }

  function nummerUebernehmen() {
    if (!baum || nummerFehler) return;
    if (normiereNummer(nummer) === baum.nummer) return setNummer(baum.nummer);
    void speichereBaum({ nummer }).then(() => setNummer((n) => normiereNummer(n)));
  }

  function notizGeaendert(text: string) {
    setNotiz(text);
    offeneNotiz.current = text;
    if (notizZeitgeber.current) clearTimeout(notizZeitgeber.current);
    notizZeitgeber.current = setTimeout(notizSpeichern, NOTIZ_VERZOEGERUNG_MS);
  }

  function notizSpeichern() {
    if (notizZeitgeber.current) clearTimeout(notizZeitgeber.current);
    notizZeitgeber.current = null;
    const offen = offeneNotiz.current;
    offeneNotiz.current = null;
    if (offen !== null) void speichereBaum({ notiz: offen });
  }

  async function loeschen() {
    if (!baum || !confirm(t('baum.loeschen_frage', { nummer: baum.nummer }))) return;
    offeneNotiz.current = null;
    try {
      await loescheBaum(baum.id);
      beiGeloescht(baum.nummer);
    } catch (e) {
      console.error(e);
      beiFehler();
    }
  }

  const aktuellerStatus = status?.status ?? STANDARD_STATUS;
  const fuellstand = status?.fuellstand ?? null;
  const sorte = baum?.sorte_id ? sorten.find((s) => s.id === baum.sorte_id) : undefined;

  return (
    <section class="panel" ref={panel} aria-label={baum ? t('baum.panel_titel', { nummer: baum.nummer }) : undefined}>
      <header class="blatt-kopf">
        <h2>{baum ? t('baum.panel_titel', { nummer: baum.nummer }) : ' '}</h2>
        <button type="button" class="knopf knopf-schliessen" onClick={beiSchliessen} aria-label={t('allgemein.schliessen')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
            <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      {baum && (
        <div class="blatt-inhalt">
          <h3>{t('baum.status_saison', { jahr })}</h3>
          <div class="auswahl-reihe" role="group" aria-label={t('baum.status_saison', { jahr })}>
            {ERNTE_STATUS.map((s) => (
              <button
                key={s}
                type="button"
                class={`knopf status-knopf status-${s}`}
                aria-pressed={aktuellerStatus === s}
                onClick={() => aktuellerStatus !== s && void speichereSaison({ status: s })}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>

          <h3>{t('baum.fuellstand')}</h3>
          <div class="auswahl-reihe" role="group" aria-label={t('baum.fuellstand')}>
            {fuellstandOptionen(fuellstandMax, fuellstand).map((n) => (
              <button
                key={n}
                type="button"
                class="knopf wahl-knopf"
                aria-pressed={fuellstand === n}
                onClick={() => fuellstand !== n && void speichereSaison({ fuellstand: n })}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              class="knopf wahl-knopf"
              aria-pressed={fuellstand === null}
              aria-label={t('baum.fuellstand_keine')}
              title={t('baum.fuellstand_keine')}
              onClick={() => fuellstand !== null && void speichereSaison({ fuellstand: null })}
            >
              –
            </button>
          </div>
          <p class="panel-hilfe">{t('baum.fuellstand_erklaerung', { max: fuellstandMax })}</p>

          <label class="feld panel-feld">
            <span>{t('baum.sorte')}</span>
            <span class="sorte-wahl">
              <span class="sorte-punkt" style={{ borderColor: sorte?.ringfarbe ?? '#ffffff' }} aria-hidden="true" />
              <select
                class="eingabe"
                value={baum.sorte_id ?? OHNE_SORTE}
                onChange={(e) => {
                  const wert = e.currentTarget.value;
                  void speichereBaum({ sorte_id: wert === OHNE_SORTE ? null : wert });
                }}
              >
                <option value={OHNE_SORTE}>{t('sorten.ohne_sorte')}</option>
                {sorten.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <label class="feld panel-feld">
            <span>{t('baum.nummer')}</span>
            <input
              class="eingabe"
              value={nummer}
              autocomplete="off"
              enterKeyHint="done"
              onInput={(e) => {
                const wert = e.currentTarget.value;
                setNummer(wert);
                setNummerFehler(pruefeNummer(wert, baeume, sprache, baumId));
              }}
              onBlur={nummerUebernehmen}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            {nummerFehler && (
              <span class="text-fehler" role="alert">
                {nummerFehler === 'leer'
                  ? t('baum.fehler.nummer_leer')
                  : t('baum.fehler.nummer_doppelt', { nummer: normiereNummer(nummer) })}
              </span>
            )}
          </label>

          <label class="feld panel-feld">
            <span>{t('baum.notiz')}</span>
            <textarea
              class="eingabe eingabe-mehrzeilig"
              rows={2}
              value={notiz}
              onInput={(e) => notizGeaendert(e.currentTarget.value)}
              onBlur={notizSpeichern}
            />
          </label>

          <dl class="panel-info">
            <dt>{t('baum.position')}</dt>
            <dd>
              {formatiereGrad(baum.lat, sprache)}, {formatiereGrad(baum.lon, sprache)}
            </dd>
            <dt>{t('baum.genauigkeit')}</dt>
            <dd>
              {baum.gps_genauigkeit_m === null
                ? t('baum.genauigkeit_unbekannt')
                : t('baum.genauigkeit_wert', { wert: formatiereMeter(baum.gps_genauigkeit_m, sprache) })}
            </dd>
            {baum.hoehe_m !== null && (
              <>
                <dt>{t('baum.hoehe')}</dt>
                <dd>{formatiereMeter(baum.hoehe_m, sprache)}</dd>
              </>
            )}
          </dl>
          <p class="panel-hilfe">
            {t('baum.zuletzt_geaendert', { zeit: formatiereZeitpunkt(letzteAenderung(baum, status), sprache) })}
          </p>

          <button type="button" class="knopf knopf-breit knopf-gefahr" onClick={() => void loeschen()}>
            {t('baum.loeschen')}
          </button>
        </div>
      )}
    </section>
  );
}
