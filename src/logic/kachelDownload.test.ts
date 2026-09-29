import { describe, expect, it } from 'vitest';
import { ladeKacheln, zaehleVorhandene, type Abrufen, type DownloadStand, type KachelSpeicher } from './kachelDownload';

function speicher(vorhanden: string[] = []): KachelSpeicher & { inhalt: Map<string, Response> } {
  const inhalt = new Map(vorhanden.map((u) => [u, new Response('alt')]));
  return {
    inhalt,
    match: async (u) => inhalt.get(u),
    put: async (u, a) => void inhalt.set(u, a),
  };
}

const ok: Abrufen = async () => new Response('bild', { status: 200 });
const urls = (n: number) => Array.from({ length: n }, (_, i) => `k/${i}`);

describe('ladeKacheln', () => {
  it('lädt fehlende Kacheln und überspringt vorhandene', async () => {
    const s = speicher(['k/1']);
    const abgerufen: string[] = [];
    const stand = await ladeKacheln(urls(3), {
      speicher: s,
      abrufen: async (u) => (abgerufen.push(u), new Response('bild')),
    });
    expect(stand).toEqual({ gesamt: 3, erledigt: 3, vorhanden: 1, neu: 2, fehler: 0, abgebrochen: false });
    expect(abgerufen.sort()).toEqual(['k/0', 'k/2']);
    expect(s.inhalt.size).toBe(3);
  });

  it('zählt Netzfehler und HTTP-Fehler, ohne sie zu speichern', async () => {
    const s = speicher();
    const stand = await ladeKacheln(urls(3), {
      speicher: s,
      abrufen: async (u) => {
        if (u === 'k/0') throw new Error('offline');
        return new Response('', { status: u === 'k/1' ? 404 : 200 });
      },
    });
    expect(stand).toMatchObject({ neu: 1, fehler: 2, erledigt: 3 });
    expect([...s.inhalt.keys()]).toEqual(['k/2']);
  });

  it('meldet den Fortschritt nach jeder Kachel', async () => {
    const staende: DownloadStand[] = [];
    await ladeKacheln(urls(5), { speicher: speicher(), abrufen: ok, parallel: 2, beiFortschritt: (s) => staende.push(s) });
    expect(staende.map((s) => s.erledigt)).toEqual([1, 2, 3, 4, 5]);
  });

  it('hält nach dem Abbrechen an', async () => {
    const abbruch = new AbortController();
    let aufrufe = 0;
    const stand = await ladeKacheln(urls(20), {
      speicher: speicher(),
      parallel: 1,
      signal: abbruch.signal,
      abrufen: async () => {
        if (++aufrufe === 3) abbruch.abort();
        return new Response('bild');
      },
    });
    expect(stand.abgebrochen).toBe(true);
    expect(stand.erledigt).toBe(3);
  });

  it('kommt mit einer leeren Liste zurecht', async () => {
    expect(await ladeKacheln([], { speicher: speicher(), abrufen: ok })).toMatchObject({ gesamt: 0, erledigt: 0 });
  });
});

describe('zaehleVorhandene', () => {
  it('zählt Kacheln, die schon im Speicher sind', async () => {
    expect(await zaehleVorhandene(urls(4), speicher(['k/0', 'k/3', 'x']))).toBe(2);
  });
});
