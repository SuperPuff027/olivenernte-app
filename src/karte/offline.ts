import type { Bereich } from '../logic/bereich';
import { ladeKacheln, zaehleVorhandene, type DownloadStand, type KachelSpeicher } from '../logic/kachelDownload';
import { kachelnFuerBereich, kachelUrl, mitPuffer } from '../logic/kacheln';
import { AKTIVE_KARTENQUELLE } from './quelle';

// Begrenzter Offline-Cache: nur Grundstück + Puffer, wenige Zoomstufen (keine Massen-Downloads).
export const OFFLINE_PUFFER_M = 100;
const OFFLINE_MIN_ZOOM = 12;
/** Grobe Schätzung für die Anzeige der Downloadgröße */
export const KACHEL_GROESSE_KB = 20;

export function offlineUnterstuetzt(): boolean {
  return typeof caches !== 'undefined';
}

export function offlineKachelUrls(bereich: Bereich): string[] {
  const quelle = AKTIVE_KARTENQUELLE;
  return kachelnFuerBereich(mitPuffer(bereich, OFFLINE_PUFFER_M), OFFLINE_MIN_ZOOM, quelle.maxZoom).map((k) =>
    kachelUrl(quelle.kachelUrl, k),
  );
}

async function kachelSpeicher(): Promise<KachelSpeicher> {
  const cache = await caches.open(AKTIVE_KARTENQUELLE.cacheName);
  return {
    match: (url) => cache.match(url),
    put: (url, antwort) => cache.put(url, antwort),
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
