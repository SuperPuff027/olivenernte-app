import { describe, expect, it } from 'vitest';
import type { Baum } from '../model/typen';
import { naechsteNummer, normiereNummer, nummerWert, pruefeNummer } from './nummern';

// Beliebige Testposition
const baum = (nummer: string, geloescht = false): Baum => ({
  id: nummer,
  nummer,
  grundstueck_id: null,
  sorte_id: null,
  lat: 20,
  lon: 10,
  gps_genauigkeit_m: null,
  hoehe_m: null,
  notiz: '',
  aktualisiert_am: '2026-01-01T00:00:00.000Z',
  geloescht,
});

describe('nummerWert', () => {
  it('liest das B-n-Format und Varianten', () => {
    expect(nummerWert('B-17')).toBe(17);
    expect(nummerWert(' b_5 ')).toBe(5);
    expect(nummerWert('B 3')).toBe(3);
    expect(nummerWert('B12')).toBe(12);
    expect(nummerWert('B-007')).toBe(7);
  });

  it('ignoriert fremde Formate', () => {
    for (const n of ['', 'B-', '17', 'X-3', 'B-3a', 'B-1.5', 'B--2', 'Baum 4', 'B-99999999999999999999']) {
      expect(nummerWert(n)).toBeNull();
    }
  });
});

describe('naechsteNummer', () => {
  it('B-1 ohne Bäume', () => {
    expect(naechsteNummer([])).toBe('B-1');
  });

  it('höchste Nummer + 1, Lücken bleiben frei', () => {
    expect(naechsteNummer([baum('B-1'), baum('B-5'), baum('B-2')])).toBe('B-6');
  });

  it('vergleicht Zahlen, nicht Text', () => {
    expect(naechsteNummer([baum('B-9'), baum('B-10')])).toBe('B-11');
  });

  it('ignoriert fremde Formate und gelöschte Bäume', () => {
    expect(naechsteNummer([baum('B-3'), baum('Olive 40'), baum('B-8', true)])).toBe('B-4');
    expect(naechsteNummer([baum('Nordecke')])).toBe('B-1');
  });

  it('zählt Varianten mit', () => {
    expect(naechsteNummer([baum('B-2'), baum('b_14')])).toBe('B-15');
  });
});

describe('normiereNummer', () => {
  it('vereinheitlicht B-n-Varianten', () => {
    expect(normiereNummer(' b7 ')).toBe('B-7');
    expect(normiereNummer('B_007')).toBe('B-7');
    expect(normiereNummer('B-12')).toBe('B-12');
  });

  it('lässt andere Nummern bis auf Rand-Leerzeichen unverändert', () => {
    expect(normiereNummer('  Nordecke 2 ')).toBe('Nordecke 2');
  });
});

describe('pruefeNummer', () => {
  const bestand = [baum('B-1'), baum('B-7'), baum('Nordecke'), baum('B-9', true)];

  it('meldet leere Nummern', () => {
    expect(pruefeNummer('', bestand, 'de')).toBe('leer');
    expect(pruefeNummer('   ', bestand, 'de')).toBe('leer');
  });

  it('erkennt vergebene Nummern auch in anderer Schreibweise', () => {
    expect(pruefeNummer('B-7', bestand, 'de')).toBe('doppelt');
    expect(pruefeNummer(' b7 ', bestand, 'de')).toBe('doppelt');
    expect(pruefeNummer('B-007', bestand, 'de')).toBe('doppelt');
    expect(pruefeNummer('NORDECKE', bestand, 'de')).toBe('doppelt');
  });

  it('erlaubt freie Nummern und die eigene', () => {
    expect(pruefeNummer('B-2', bestand, 'de')).toBeNull();
    expect(pruefeNummer('Südecke', bestand, 'de')).toBeNull();
    expect(pruefeNummer('b-7', bestand, 'de', 'B-7')).toBeNull();
  });

  it('gelöschte Bäume geben ihre Nummer frei', () => {
    expect(pruefeNummer('B-9', bestand, 'de')).toBeNull();
  });

  it('beachtet türkische Kleinschreibung', () => {
    const tr = [baum('KIYI')];
    // Türkisch: I wird zu ı, also ist „kıyı“ dieselbe Nummer, „kiyi“ nicht.
    expect(pruefeNummer('kıyı', tr, 'tr')).toBe('doppelt');
    expect(pruefeNummer('kiyi', tr, 'tr')).toBeNull();
  });
});
