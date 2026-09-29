// Lädt eine feste Liste von Kacheln in einen Cache (Cache Storage im Browser).
// Speicher und Abruf sind injiziert, damit die Logik ohne Browser testbar ist.

export interface KachelSpeicher {
  match(url: string): Promise<Response | undefined>;
  put(url: string, antwort: Response): Promise<void>;
}

export type Abrufen = (url: string, signal?: AbortSignal) => Promise<Response>;

export interface DownloadStand {
  gesamt: number;
  /** vorhanden + neu + fehler */
  erledigt: number;
  vorhanden: number;
  neu: number;
  fehler: number;
  abgebrochen: boolean;
}

export async function zaehleVorhandene(urls: readonly string[], speicher: KachelSpeicher): Promise<number> {
  const treffer = await Promise.all(urls.map((u) => speicher.match(u)));
  return treffer.filter(Boolean).length;
}

export async function ladeKacheln(
  urls: readonly string[],
  optionen: {
    speicher: KachelSpeicher;
    abrufen: Abrufen;
    parallel?: number;
    signal?: AbortSignal;
    beiFortschritt?: (stand: DownloadStand) => void;
  },
): Promise<DownloadStand> {
  const { speicher, abrufen, parallel = 4, signal, beiFortschritt } = optionen;
  const stand: DownloadStand = { gesamt: urls.length, erledigt: 0, vorhanden: 0, neu: 0, fehler: 0, abgebrochen: false };
  let naechste = 0;

  async function arbeite() {
    while (naechste < urls.length && !signal?.aborted) {
      const url = urls[naechste++]!;
      try {
        if (await speicher.match(url)) {
          stand.vorhanden++;
        } else {
          const antwort = await abrufen(url, signal);
          if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
          await speicher.put(url, antwort);
          stand.neu++;
        }
      } catch {
        if (signal?.aborted) break;
        stand.fehler++;
      }
      stand.erledigt = stand.vorhanden + stand.neu + stand.fehler;
      beiFortschritt?.({ ...stand });
    }
  }

  await Promise.all(Array.from({ length: Math.min(parallel, urls.length) }, arbeite));
  stand.abgebrochen = signal?.aborted ?? false;
  return { ...stand };
}
