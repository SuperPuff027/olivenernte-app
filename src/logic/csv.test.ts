import { describe, expect, it } from 'vitest';
import type { Baum, SaisonStatus, Sorte } from '../model/typen';
import { baumZeilen, csvDateiname, csvText, csvZelle, ernteZeilen } from './csv';
import type { ExportDaten } from './exportGeojson';

const BOM = String.fromCharCode(0xfeff);
const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };

describe('csvZelle', () => {
  it('Zahlen mit dem Dezimalzeichen der Sprache, ohne Tausendertrennung', () => {
    expect(csvZelle(12.5, 'de')).toBe('12,5');
    expect(csvZelle(12.5, 'tr')).toBe('12,5');
    expect(csvZelle(12.5, 'en')).toBe('12.5');
    expect(csvZelle(20.0012345, 'de')).toBe('20,0012345');
    expect(csvZelle(1234, 'de')).toBe('1234');
    expect(csvZelle(null, 'de')).toBe('');
    // Gleitkomma-Reste verschwinden (höchstens 7 Nachkommastellen)
    expect(csvZelle(10.0003 + 0.0003, 'de')).toBe('10,0006');
    expect(csvZelle(0.1 + 0.2, 'en')).toBe('0.3');
  });

  it('setzt Anführungszeichen bei Trennzeichen, Anführungszeichen und Zeilenumbrüchen', () => {
    expect(csvZelle('a;b', 'de')).toBe('"a;b"');
    expect(csvZelle('a;b', 'en')).toBe('a;b');
    expect(csvZelle('a,b', 'en')).toBe('"a,b"');
    expect(csvZelle('sagt "hallo"', 'de')).toBe('"sagt ""hallo"""');
    expect(csvZelle('Zeile 1\nZeile 2', 'de')).toBe('"Zeile 1\nZeile 2"');
    expect(csvZelle('Ayvalık ı İ ş', 'tr')).toBe('Ayvalık ı İ ş');
  });

  it('entschärft Texte, die Excel als Formel ausführen würde', () => {
    expect(csvZelle('=SUMME(A1)', 'de')).toBe("'=SUMME(A1)");
    expect(csvZelle('+49', 'de')).toBe("'+49");
    expect(csvZelle('-5 kg weniger', 'de')).toBe("'-5 kg weniger");
    expect(csvZelle('@x', 'de')).toBe("'@x");
    expect(csvZelle(-5, 'de')).toBe('-5');
  });
});

describe('csvText', () => {
  it('BOM, Kopfzeile, Trennzeichen je Sprache, CRLF', () => {
    expect(csvText(['A', 'B'], [[1.5, 'x'], [null, 'y']], 'de')).toBe(`${BOM}A;B\r\n1,5;x\r\n;y\r\n`);
    expect(csvText(['A', 'B'], [[1.5, 'x']], 'en')).toBe(`${BOM}A,B\r\n1.5,x\r\n`);
  });
});

// Beliebige Testkoordinaten
const baum = (id: string, nummer: string, sorte_id: string | null, weitere: Partial<Baum> = {}): Baum => ({
  id,
  nummer,
  grundstueck_id: 'g',
  sorte_id,
  lat: 20.0012,
  lon: 10.0034,
  gps_genauigkeit_m: null,
  hoehe_m: null,
  notiz: '',
  ...basis,
  ...weitere,
});
const status = (baum_id: string, jahr: number, s: SaisonStatus['status'], weitere: Partial<SaisonStatus> = {}): SaisonStatus => ({
  baum_id,
  jahr,
  status: s,
  fuellstand: null,
  ertrag_kg: null,
  erntedatum: null,
  ...basis,
  ...weitere,
});
const sorten: Sorte[] = [
  { id: 'm', name: 'Memecik', ringfarbe: '#1e88e5', ...basis },
  { id: 'x', name: 'Alt', ringfarbe: '#000000', ...basis, geloescht: true },
];
const DATEN: ExportDaten = {
  grundstuecke: [],
  sorten,
  baeume: [
    baum('b10', 'B-10', 'm'),
    baum('b2', 'B-2', 'm', { gps_genauigkeit_m: 2.5, hoehe_m: 55, notiz: 'Schnitt' }),
    baum('b3', 'B-3', 'x'),
    baum('b9', 'B-9', null, { geloescht: true }),
  ],
  saisonStatus: [
    status('b2', 2026, 'geerntet', { fuellstand: 4, ertrag_kg: 31.5, erntedatum: '2026-10-12' }),
    status('b2', 2025, 'geerntet', { fuellstand: 3, ertrag_kg: 20, erntedatum: '2025-11-02' }),
    status('b10', 2026, 'bereit', { fuellstand: 5, ertrag_kg: 99, erntedatum: '2025-01-01' }),
    status('b3', 2025, 'geerntet', { ertrag_kg: 7, geloescht: true }),
    status('b9', 2026, 'geerntet', { ertrag_kg: 50 }),
  ],
};
const text = (s: SaisonStatus['status']) => s.toUpperCase();

describe('baumZeilen', () => {
  const zeilen = baumZeilen(DATEN, 2026, text);

  it('aktive Bäume, natürlich nach Nummer sortiert', () => {
    expect(zeilen.map((z) => z[0])).toEqual(['B-2', 'B-3', 'B-10']);
  });

  it('Werte der Saison; Ertrag und Datum nur bei geerntet; gelöschte Sorte leer', () => {
    expect(zeilen[0]).toEqual(['B-2', 'Memecik', 20.0012, 10.0034, 2.5, 55, 'GEERNTET', 4, 31.5, '2026-10-12', 'Schnitt', 'b2']);
    expect(zeilen[1]).toEqual(['B-3', null, 20.0012, 10.0034, null, null, null, null, null, null, null, 'b3']);
    expect(zeilen[2]?.slice(6, 10)).toEqual(['BEREIT', 5, null, null]);
  });
});

describe('ernteZeilen', () => {
  it('eine Zeile pro Baum und Saison, neueste Saison zuerst', () => {
    expect(ernteZeilen(DATEN, text)).toEqual([
      ['B-2', 'Memecik', 2026, 'GEERNTET', 4, 31.5, '2026-10-12', 'b2'],
      ['B-2', 'Memecik', 2025, 'GEERNTET', 3, 20, '2025-11-02', 'b2'],
      ['B-10', 'Memecik', 2026, 'BEREIT', 5, null, null, 'b10'],
    ]);
  });
});

describe('csvDateiname', () => {
  it('mit Art und lokalem Datum', () => {
    expect(csvDateiname('ernte', new Date(2026, 8, 30, 23, 59))).toBe('hrvst-ernte-2026-09-30.csv');
    expect(csvDateiname('baeume', new Date(2026, 0, 2))).toBe('hrvst-baeume-2026-01-02.csv');
  });
});
