import type { Bereich } from '../logic/bereich';
import { ladeKacheln, zaehleVorhandene, type DownloadStand, type KachelSpeicher } from '../logic/kachelDownload';
import { kachelnFuerBereich, kachelUrl, mitPuffer } from '../logic/kacheln';
import { KACHELQUELLEN } from './quelle';

// Begrenzter Offline-Cache: nur Grundstück + Puffer, wenige Zoomstufen (keine Massen-Downloads).
export const OFFLINE_PUFFER_M = 100;
const OFFLINE_MIN_ZOOM = 12;
/** Grobe Schätzung für die Anzeige der Downloadgröße */
export const KACHEL_GROESSE_KB = 20;

export function offlineUnterstuetzt(): boolean {
  return typeof caches !== 'undefined';
}

/** Kacheln aller Quellen (Luftbild und Beschriftung) für das Grundstück samt Puffer. */
export function offlineKachelUrls(bereich: Bereich): string[] {
  const gepuffert = mitPuffer(bereich, OFFLINE_PUFFER_M);
  return KACHELQUELLEN.flatMap((quelle) =>
    kachelnFuerBereich(gepuffert, OFFLINE_MIN_ZOOM, quelle.maxZoom).map((k) => kachelUrl(quelle.kachelUrl, k)),
  );
}

/** Speichert jede Kachel im Cache ihrer Quelle (derselbe, den der Service Worker nutzt). */
async function kachelSpeicher(): Promise<KachelSpeicher> {
  const offen = await Promise.all(KACHELQUELLEN.map(async (q) => ({ q, cache: await caches.open(q.cacheName) })));
  const fuer = (url: string) => {
    const treffer = offen.find(({ q }) => url.startsWith(q.kachelUrlPraefix)) ?? offen[0];
    if (!treffer) throw new Error('Keine Kachelquelle');
    return treffer.cache;
  };
  return {
    match: (url) => fuer(url).match(url),
    put: (url, antwort) => fuer(url).put(url, antwort),
  };
}

export async function zaehleOfflineKacheln(urls: readonly string[]): Promise<number> {
  return zaehleVorhandene(urls, await kachelSpeicher());
}

export async function speichereOffline(
  urls: readonly string[],
  signal: AbortSignal,
  beiFortschritt: (stand: DownloadStand) => void,
): Promise<DownloadStand> {
  return ladeKacheln(urls, {
    speicher: await kachelSpeicher(),
    abrufen: (url, s) => fetch(url, { mode: 'cors', signal: s }),
    signal,
    beiFortschritt,
  });
}
