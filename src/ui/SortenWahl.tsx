import { useState } from 'preact/hooks';
import { aendereSorte, legeSorteAn } from '../db/sorten';
import { useSprache } from '../i18n/kontext';
import { RING_OHNE_SORTE } from '../logic/farben';
import { naechsteRingfarbe, pruefeSortenname, type NamensFehler } from '../logic/sorten';
import type { Sorte } from '../model/typen';
import { FarbAuswahl } from './FarbAuswahl';

interface Props {
  sorteId: string | null;
  /** Aktive Sorten, sortiert */
  sorten: readonly Sorte[];
  /** Sorte des Baums setzen (null = ohne Sorte) */
  beiWahl: (sorteId: string | null) => Promise<void>;
  /** Eine Sorte wurde angelegt oder umgefärbt: Liste und Karte neu laden. */
  beiSortenGeaendert: () => Promise<void>;
  beiFehler: () => void;
}

const OHNE_SORTE = '';
const NEUE_SORTE = '__neu__';

/** Sorte eines Baums: aus der Liste wählen, neue Sorte mit Farbe anlegen, Farbe der Sorte ändern. */
export function SortenWahl({ sorteId, sorten, beiWahl, beiSortenGeaendert, beiFehler }: Props) {
  const { t, sprache } = useSprache();
  const [neu, setNeu] = useState<{ name: string; farbe: string; fehler: NamensFehler | null } | null>(null);
  const [farbeAendern, setFarbeAendern] = useState(false);
  const sorte = sorteId ? sorten.find((s) => s.id === sorteId) : undefined;

  async function ausfuehren(aktion: () => Promise<void>) {
    try {
      await aktion();
    } catch (e) {
      console.error(e);
      beiFehler();
    }
  }

  function anlegen(e: Event) {
    e.preventDefault();
    if (!neu) return;
    const fehler = pruefeSortenname(neu.name, sorten, sprache);
    if (fehler) return setNeu({ ...neu, fehler });
    const { name, farbe } = neu;
    setNeu(null);
    void ausfuehren(async () => {
      const angelegt = await legeSorteAn(name, farbe);
      await beiSortenGeaendert();
      await beiWahl(angelegt.id);
    });
  }

  return (
    <div class="feld panel-feld">
      <span id="sorte-beschriftung">{t('baum.sorte')}</span>
      <span class="sorte-wahl">
        <button
          type="button"
          class="sorte-punkt-knopf"
          disabled={!sorte}
          aria-expanded={farbeAendern}
          aria-label={sorte ? t('sorten.farbe_von', { name: sorte.name }) : undefined}
          onClick={() => setFarbeAendern(!farbeAendern)}
        >
          <span class="sorte-punkt" style={{ borderColor: sorte?.ringfarbe ?? RING_OHNE_SORTE }} aria-hidden="true" />
        </button>
        <select
          class="eingabe"
          aria-labelledby="sorte-beschriftung"
          value={sorteId ?? OHNE_SORTE}
          onChange={(e) => {
            const wert = e.currentTarget.value;
            if (wert === NEUE_SORTE) {
              // Auswahl bleibt beim bisherigen Wert, bis die neue Sorte angelegt ist.
              e.currentTarget.value = sorteId ?? OHNE_SORTE;
              setFarbeAendern(false);
              setNeu({ name: '', farbe: naechsteRingfarbe(sorten), fehler: null });
              return;
            }
            setFarbeAendern(false);
            void ausfuehren(() => beiWahl(wert === OHNE_SORTE ? null : wert));
          }}
        >
          <option value={OHNE_SORTE}>{t('sorten.ohne_sorte')}</option>
          {sorten.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={NEUE_SORTE}>{t('sorten.neue_sorte')}</option>
        </select>
      </span>

      {farbeAendern && sorte && (
        <FarbAuswahl
          wert={sorte.ringfarbe}
          beschriftung={t('sorten.farbe_von', { name: sorte.name })}
          beiWahl={(farbe) => {
            setFarbeAendern(false);
            void ausfuehren(async () => {
              await aendereSorte(sorte.id, { ringfarbe: farbe });
              await beiSortenGeaendert();
            });
          }}
        />
      )}

      {neu && (
        <form class="sorte-anlegen" onSubmit={anlegen}>
          <input
            class="eingabe"
            value={neu.name}
            placeholder={t('sorten.neu_platzhalter')}
            aria-label={t('sorten.neu_platzhalter')}
            autoFocus
            onInput={(e) => setNeu({ ...neu, name: e.currentTarget.value, fehler: null })}
          />
          {neu.fehler && <span class="text-fehler">{t(`sorten.fehler.${neu.fehler}`)}</span>}
          <span>{t('sorten.farbe')}</span>
          <FarbAuswahl wert={neu.farbe} beschriftung={t('sorten.farbe')} beiWahl={(farbe) => setNeu({ ...neu, farbe })} />
          <div class="sorte-umbenennen-knoepfe">
            <button type="button" class="knopf" onClick={() => setNeu(null)}>
              {t('allgemein.abbrechen')}
            </button>
            <button type="submit" class="knopf knopf-primaer">
              {t('sorten.anlegen')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
