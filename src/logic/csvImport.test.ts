import { describe, expect, it } from 'vitest';
import { de } from '../i18n/de';
import { en } from '../i18n/en';
import { tr } from '../i18n/tr';
import type { Baum, Sorte } from '../model/typen';
import { BAUM_SPALTEN, baumZeilen, csvText } from './csv';
import { erkenneTrenner, leseCsvBaeume, leseDezimal, normiereUeberschrift, zerlegeCsv } from './csvImport';
import type { Sprache } from './sprache';

const BOM = String.fromCharCode(0xfeff);

describe('erkenneTrenner', () => {
  it('häufigstes Zeichen außerhalb von Anführungszeichen', () => {
    expect(erkenneTrenner('Nummer;Breite;Länge')).toBe(';');
    expect(erkenneTrenner('Number,Latitude,Longitude')).toBe(',');
    expect(erkenneTrenner('Nr\tLat\tLon')).toBe('\t');
    expect(erkenneTrenner('"a,b,c";d;e')).toBe(';');
  });
});

describe('zerlegeCsv', () => {
  it('Anführungszeichen, verdoppelte Anführungszeichen, Umbrüche in Zellen, CRLF und BOM', () => {
    const text = `${BOM}a;b\r\n"x;y";"sagt ""hi"""\r\n"Zeile 1\nZeile 2";z\r\n`;
    expect(zerlegeCsv(text)).toEqual([
      ['a', 'b'],
      ['x;y', 'sagt "hi"'],
      ['Zeile 1\nZeile 2', 'z'],
    ]);
  });

  it('letzte Zeile ohne Zeilenende, leere Zellen', () => {
    expect(zerlegeCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });
});

describe('normiereUeberschrift', () => {
  it('klein, ohne Klammern, Jahre, Umlaute und Sonderzeichen', () => {
    expect(normiereUeberschrift('Länge')).toBe('laenge');
    expect(normiereUeberschrift('GPS-Genauigkeit (m)')).toBe('gpsgenauigkeit');
    expect(normiereUeberschrift('Status 2026')).toBe('status');
    expect(normiereUeberschrift('Çeşit')).toBe('cesit');
    expect(normiereUeberschrift('Ağaç ID')).toBe('agacid');
    expect(normiereUeberschrift(' LATITUDE ')).toBe('latitude');
  });
});

describe('leseDezimal', () => {
  it('Komma oder Punkt, Vorzeichen; sonst null', () => {
    expect(leseDezimal('20,0005')).toBe(20.0005);
    expect(leseDezimal(' 20.0005 ')).toBe(20.0005);
    expect(leseDezimal('-3,5')).toBe(-3.5);
    expect(leseDezimal('12')).toBe(12);
    for (const t of ['', 'abc', '1.234,5', '1,2,3', '12e3']) expect(leseDezimal(t)).toBeNull();
  });
});

const lies = (text: string) => {
  const e = leseCsvBaeume(text);
  if (!e.ok) throw new Error(e.fehler);
  return e.daten;
};

describe('leseCsvBaeume', () => {
  it('einfache Excel-Tabelle mit deutschen Überschriften und Dezimalkomma', () => {
    const d = lies('Nummer;Breite;Länge;Sorte;Notiz\nB-1;20,0012;10,0034;Memecik;alt\nB-2;20,0015;10,0036;;\n');
    expect(d.grundstueck).toBeNull();
    expect(d.baeume).toEqual([
      { nr: 2, id: null, nummer: 'B-1', lat: 20.0012, lon: 10.0034, hoehe_m: null, gps_genauigkeit_m: null, sorte: 'Memecik', notiz: 'alt', aktualisiert_am: null, saison: [] },
      { nr: 3, id: null, nummer: 'B-2', lat: 20.0015, lon: 10.0036, hoehe_m: null, gps_genauigkeit_m: null, sorte: null, notiz: '', aktualisiert_am: null, saison: [] },
    ]);
  });

  it('englische und türkische Überschriften, Kurzformen, beliebige Spaltenreihenfolge', () => {
    expect(lies('Lat,Lon,Tree\n20.1,10.2,T1').baeume[0]).toMatchObject({ nummer: 'T1', lat: 20.1, lon: 10.2 });
    expect(lies('Numara;Enlem;Boylam;Çeşit\nA-1;20,1;10,2;Ayvalık').baeume[0]).toMatchObject({
      nummer: 'A-1',
      sorte: 'Ayvalık',
    });
  });

  it('meldet fehlende Pflichtspalten und leere Dateien', () => {
    expect(leseCsvBaeume('Nummer;Sorte\nB-1;Memecik')).toEqual({ ok: false, fehler: 'spalten_fehlen' });
    expect(leseCsvBaeume('Nummer;Breite;Länge\n')).toEqual({ ok: false, fehler: 'leer' });
    expect(leseCsvBaeume('')).toEqual({ ok: false, fehler: 'leer' });
  });

  it('überspringt fehlerhafte Zeilen mit Grund und Zeilennummer wie im Tabellenprogramm', () => {
    const d = lies('Nummer;Breite;Länge\nB-1;20;10\n;20;10\nB-1;20;10\nB-2;abc;10\nB-3;95;10\n;;\nB-4;20;10');
    expect(d.baeume.map((b) => b.nummer)).toEqual(['B-1', 'B-4']);
    expect(d.uebersprungen).toEqual([
      { nr: 3, nummer: null, grund: 'ohne_nummer' },
      { nr: 4, nummer: 'B-1', grund: 'nummer_doppelt' },
      { nr: 5, nummer: 'B-2', grund: 'ungueltige_geometrie' },
      { nr: 6, nummer: 'B-3', grund: 'ungueltige_geometrie' },
    ]);
  });

  it('entfernt das Apostroph des Excel-Formelschutzes', () => {
    expect(lies("Nummer;Breite;Länge;Notiz\nB-1;20;10;'=wichtig").baeume[0]?.notiz).toBe('=wichtig');
  });

  describe('liest den eigenen CSV-Export wieder ein', () => {
    const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
    // Beliebige Testkoordinaten
    const baeume: Baum[] = [
      { id: 'id-1', nummer: 'B-1', grundstueck_id: null, sorte_id: 'm', lat: 20.0012345, lon: 10.0034567, gps_genauigkeit_m: 2.5, hoehe_m: 55.5, notiz: 'Schnitt; "bald"\nZweite Zeile', ...basis },
      { id: 'id-2', nummer: 'B-10', grundstueck_id: null, sorte_id: null, lat: -20.5, lon: -10.25, gps_genauigkeit_m: null, hoehe_m: null, notiz: '-5 kg', ...basis },
    ];
    const sorten: Sorte[] = [{ id: 'm', name: 'Ayvalık', ringfarbe: '#1e88e5', ...basis }];
    const texte = { de, en, tr };

    for (const sprache of ['de', 'en', 'tr'] as const satisfies readonly Sprache[]) {
      it(sprache, () => {
        const kopf = BAUM_SPALTEN.map((s) => texte[sprache][`csv.baum.${s}`].replace('{saison}', '2026'));
        const zeilen = baumZeilen({ grundstuecke: [], baeume, sorten, saisonStatus: [] }, 2026, (s) => s);
        const gelesen = lies(csvText(kopf, zeilen, sprache));
        expect(gelesen.uebersprungen).toEqual([]);
        expect(gelesen.baeume).toMatchObject([
          { id: 'id-1', nummer: 'B-1', lat: 20.0012345, lon: 10.0034567, hoehe_m: 55.5, gps_genauigkeit_m: 2.5, sorte: 'Ayvalık', notiz: 'Schnitt; "bald"\nZweite Zeile', aktualisiert_am: null, saison: [] },
          { id: 'id-2', nummer: 'B-10', lat: -20.5, lon: -10.25, hoehe_m: null, gps_genauigkeit_m: null, sorte: null, notiz: '-5 kg', aktualisiert_am: null, saison: [] },
        ]);
      });
    }
  });
});
