import { useEffect, useRef, useState } from 'preact/hooks';
import { ladeBestand } from '../db/import';
import { useSprache } from '../i18n/kontext';
import {
  KACHEL_GROESSE_KB,
  OFFLINE_PUFFER_M,
  offlineKachelUrls,
  offlineUnterstuetzt,
  speichereOffline,
  zaehleOfflineKacheln,
} from '../karte/offline';
import { bereichVon } from '../logic/bereich';
import { formatiereZahl } from '../logic/format';
import type { DownloadStand } from '../logic/kachelDownload';
import { Blatt } from './Blatt';

type Zustand =
  | { art: 'pruefe' }
  | { art: 'nicht_unterstuetzt' }
  | { art: 'kein_grundstueck' }
  | { art: 'bereit'; urls: string[]; vorhanden: number }
  | { art: 'laedt'; urls: string[]; stand: DownloadStand | null }
  | { art: 'fertig'; urls: string[]; stand: DownloadStand };

export function OfflineKarte({ beiSchliessen }: { beiSchliessen: () => void }) {
  const { t, sprache } = useSprache();
  const [zustand, setZustand] = useState<Zustand>({ art: 'pruefe' });
  const abbruch = useRef<AbortController | null>(null);

  async function pruefe() {
    if (!offlineUnterstuetzt()) return setZustand({ art: 'nicht_unterstuetzt' });
    const bestand = await ladeBestand();
    const grundstueck = bestand.grundstuecke[0] ?? null;
    const bereich = grundstueck ? bereichVon(grundstueck, bestand.baeume) : null;
    if (!bereich) return setZustand({ art: 'kein_grundstueck' });
    const urls = offlineKachelUrls(bereich);
    setZustand({ art: 'bereit', urls, vorhanden: await zaehleOfflineKacheln(urls) });
  }

  useEffect(() => {
    void pruefe().catch(console.error);
    return () => abbruch.current?.abort();
  }, []);

  async function starte(urls: string[]) {
    abbruch.current = new AbortController();
    setZustand({ art: 'laedt', urls, stand: null });
    const stand = await speichereOffline(urls, abbruch.current.signal, (s) =>
      setZustand({ art: 'laedt', urls, stand: s }),
    );
    abbruch.current = null;
    setZustand({ art: 'fertig', urls, stand });
  }

  let inhalt;
  let aktionen;
  switch (zustand.art) {
    case 'pruefe':
      inhalt = <p>{t('offline.pruefe')}</p>;
      break;
    case 'nicht_unterstuetzt':
      inhalt = <p>{t('offline.nicht_unterstuetzt')}</p>;
      break;
    case 'kein_grundstueck':
      inhalt = <p>{t('offline.kein_grundstueck')}</p>;
      break;
    case 'bereit': {
      const fehlend = zustand.urls.length - zustand.vorhanden;
      const mb = formatiereZahl((fehlend * KACHEL_GROESSE_KB) / 1024, sprache, 1);
      inhalt = (
        <>
          <p>{t('offline.beschreibung', { puffer: OFFLINE_PUFFER_M })}</p>
          <p>
            <strong>{t('offline.stand', { vorhanden: zustand.vorhanden, gesamt: zustand.urls.length })}</strong>
          </p>
          <p>{fehlend === 0 ? t('offline.vollstaendig') : t('offline.groesse', { mb })}</p>
        </>
      );
      aktionen =
        fehlend > 0 ? (
          <button type="button" class="knopf knopf-primaer" onClick={() => void starte(zustand.urls)}>
            {t('offline.starten')}
          </button>
        ) : undefined;
      break;
    }
    case 'laedt': {
      const erledigt = zustand.stand?.erledigt ?? 0;
      inhalt = (
        <>
          <p>{t('offline.laedt', { erledigt, gesamt: zustand.urls.length })}</p>
          <progress class="fortschritt" max={zustand.urls.length} value={erledigt} />
        </>
      );
      aktionen = (
        <button type="button" class="knopf" onClick={() => abbruch.current?.abort()}>
          {t('allgemein.abbrechen')}
        </button>
      );
      break;
    }
    case 'fertig': {
      const { stand } = zustand;
      inhalt = (
        <>
          <p>{stand.abgebrochen ? t('offline.abgebrochen') : t('offline.fertig', { neu: stand.neu, vorhanden: stand.vorhanden })}</p>
          {stand.fehler > 0 && <p class="text-fehler">{t('offline.fehler', { fehler: stand.fehler })}</p>}
        </>
      );
      aktionen =
        stand.fehler > 0 || stand.abgebrochen ? (
          <button type="button" class="knopf knopf-primaer" onClick={() => void starte(zustand.urls)}>
            {t('offline.erneut')}
          </button>
        ) : undefined;
      break;
    }
  }

  return (
    <Blatt titel={t('offline.titel')} beiSchliessen={beiSchliessen} aktionen={aktionen}>
      {inhalt}
    </Blatt>
  );
}
