import { useEffect, useState } from 'preact/hooks';
import { ladeBestand } from '../db/import';
import { aendereSorte, legeSorteAn, loescheSorte } from '../db/sorten';
import { useSprache } from '../i18n/kontext';
import {
  istHexFarbe,
  naechsteRingfarbe,
  pruefeLoeschen,
  pruefeSortenname,
  sortiereSorten,
  zaehleBaeumeMitSorte,
  type NamensFehler,
} from '../logic/sorten';
import type { Baum, Sorte } from '../model/typen';
import { Blatt } from './Blatt';

interface Props {
  beiSchliessen: () => void;
  /** Nach jeder Änderung, damit die Karte neu zeichnen kann. */
  beiGeaendert: () => void;
  beiFehler: () => void;
}

const OHNE_SORTE = '';

export function SortenVerwaltung({ beiSchliessen, beiGeaendert, beiFehler }: Props) {
  const { t, sprache } = useSprache();
  const [sorten, setSorten] = useState<Sorte[]>([]);
  const [baeume, setBaeume] = useState<readonly Baum[]>([]);
  const [neuerName, setNeuerName] = useState('');
  const [neuFehler, setNeuFehler] = useState<NamensFehler | null>(null);
  const [umbenennen, setUmbenennen] = useState<{ id: string; name: string; fehler: NamensFehler | null } | null>(null);
  const [loeschen, setLoeschen] = useState<{ sorte: Sorte; anzahl: number; ziel: string } | null>(null);

  async function lade() {
    const bestand = await ladeBestand();
    setSorten(sortiereSorten(bestand.sorten, sprache));
    setBaeume(bestand.baeume);
  }

  useEffect(() => {
    void lade().catch(console.error);
  }, []);

  async function ausfuehren(aktion: () => Promise<unknown>) {
    try {
      await aktion();
      await lade();
      beiGeaendert();
    } catch (e) {
      console.error(e);
      beiFehler();
    }
  }

  function hinzufuegen(e: Event) {
    e.preventDefault();
    const fehler = pruefeSortenname(neuerName, sorten, sprache);
    setNeuFehler(fehler);
    if (fehler) return;
    const name = neuerName;
    setNeuerName('');
    void ausfuehren(() => legeSorteAn(name, naechsteRingfarbe(sorten)));
  }

  function umbenennenSpeichern(e: Event) {
    e.preventDefault();
    if (!umbenennen) return;
    const fehler = pruefeSortenname(umbenennen.name, sorten, sprache, umbenennen.id);
    if (fehler) return setUmbenennen({ ...umbenennen, fehler });
    const { id, name } = umbenennen;
    setUmbenennen(null);
    void ausfuehren(() => aendereSorte(id, { name }));
  }

  function loeschenStarten(sorte: Sorte) {
    const pruefung = pruefeLoeschen(baeume, sorte.id);
    if (pruefung.art === 'rueckfrage') {
      setLoeschen({ sorte, anzahl: pruefung.anzahlBaeume, ziel: OHNE_SORTE });
    } else if (confirm(t('sorten.loeschen_frage', { name: sorte.name }))) {
      void ausfuehren(() => loescheSorte(sorte.id, null));
    }
  }

  if (loeschen) {
    const andere = sorten.filter((s) => s.id !== loeschen.sorte.id);
    return (
      <Blatt
        titel={t('sorten.loeschen_titel', { name: loeschen.sorte.name })}
        beiSchliessen={() => setLoeschen(null)}
        aktionen={
          <>
            <button type="button" class="knopf" onClick={() => setLoeschen(null)}>
              {t('sorten.behalten')}
            </button>
            <button
              type="button"
              class="knopf knopf-primaer"
              onClick={() => {
                const { sorte, ziel } = loeschen;
                setLoeschen(null);
                void ausfuehren(() => loescheSorte(sorte.id, ziel === OHNE_SORTE ? null : ziel));
              }}
            >
              {t('sorten.umhaengen_und_loeschen')}
            </button>
          </>
        }
      >
        <p>{t('sorten.zugeordnet', { n: loeschen.anzahl })}</p>
        <label class="feld">
          <span>{t('sorten.umhaengen_auf')}</span>
          <select
            class="eingabe"
            value={loeschen.ziel}
            onChange={(e) => setLoeschen({ ...loeschen, ziel: e.currentTarget.value })}
          >
            <option value={OHNE_SORTE}>{t('sorten.ohne_sorte')}</option>
            {andere.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </Blatt>
    );
  }

  return (
    <Blatt titel={t('sorten.titel')} beiSchliessen={beiSchliessen}>
      {sorten.length === 0 && <p>{t('sorten.leer')}</p>}
      <ul class="sorten-liste">
        {sorten.map((s) => (
          <li key={s.id} class="sorte">
            <label class="sorte-farbe" style={{ background: s.ringfarbe }} aria-label={t('sorten.farbe_aendern', { name: s.name })}>
              <input
                type="color"
                class="versteckt"
                value={s.ringfarbe}
                onChange={(e) => {
                  const farbe = e.currentTarget.value;
                  if (istHexFarbe(farbe)) void ausfuehren(() => aendereSorte(s.id, { ringfarbe: farbe }));
                }}
              />
            </label>
            {umbenennen?.id === s.id ? (
              <form class="sorte-umbenennen" onSubmit={umbenennenSpeichern}>
                <input
                  class="eingabe"
                  value={umbenennen.name}
                  onInput={(e) => setUmbenennen({ ...umbenennen, name: e.currentTarget.value, fehler: null })}
                  autoFocus
                />
                {umbenennen.fehler && <span class="text-fehler">{t(`sorten.fehler.${umbenennen.fehler}`)}</span>}
                <div class="sorte-umbenennen-knoepfe">
                  <button type="button" class="knopf" onClick={() => setUmbenennen(null)}>
                    {t('allgemein.abbrechen')}
                  </button>
                  <button type="submit" class="knopf knopf-primaer">
                    {t('allgemein.speichern')}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <button
                  type="button"
                  class="sorte-name"
                  onClick={() => setUmbenennen({ id: s.id, name: s.name, fehler: null })}
                  aria-label={t('sorten.umbenennen', { name: s.name })}
                >
                  <span>{s.name}</span>
                  <small>{t('sorten.baeume', { n: zaehleBaeumeMitSorte(baeume, s.id) })}</small>
                </button>
                <button
                  type="button"
                  class="knopf knopf-symbolisch"
                  onClick={() => loeschenStarten(s)}
                  aria-label={t('sorten.loeschen', { name: s.name })}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
                    <path
                      d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <form class="sorte-neu" onSubmit={hinzufuegen}>
        <input
          class="eingabe"
          value={neuerName}
          placeholder={t('sorten.neu_platzhalter')}
          aria-label={t('sorten.neu_platzhalter')}
          onInput={(e) => {
            setNeuerName(e.currentTarget.value);
            setNeuFehler(null);
          }}
        />
        <button type="submit" class="knopf knopf-primaer">
          {t('sorten.hinzufuegen')}
        </button>
      </form>
      {neuFehler && <p class="text-fehler">{t(`sorten.fehler.${neuFehler}`)}</p>}
    </Blatt>
  );
}
