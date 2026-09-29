import { describe, expect, it } from 'vitest';
import { STATUS_FARBEN } from './farben';
import type { Baum, Sorte } from '../model/typen';
import {
  istHexFarbe,
  farbName,
  FARB_NAMEN,
  naechsteRingfarbe,
  pruefeLoeschen,
  pruefeSortenname,
  RINGFARBEN_VORSCHLAG,
  sortiereSorten,
  zaehleBaeumeMitSorte,
} from './sorten';

const basis = { aktualisiert_am: '2026-01-01T00:00:00.000Z', geloescht: false };
const sorte = (id: string, name: string, ringfarbe = '#123456', geloescht = false): Sorte => ({
  id,
  name,
  ringfarbe,
  ...basis,
  geloescht,
});
const baum = (sorte_id: string | null, geloescht = false) => ({ sorte_id, geloescht }) as Baum;

describe('sortiereSorten', () => {
  it('sortiert nach türkischem Alphabet', () => {
    const sorten = [sorte('1', 'Uslu'), sorte('2', 'Çakır'), sorte('3', 'Ayvalık'), sorte('4', 'Cevat')];
    expect(sortiereSorten(sorten, 'tr').map((s) => s.name)).toEqual(['Ayvalık', 'Cevat', 'Çakır', 'Uslu']);
  });
});

describe('pruefeSortenname', () => {
  const sorten = [sorte('m', 'Memecik'), sorte('g', 'Gemlik', '#000000', true)];

  it('lehnt leere Namen ab', () => {
    expect(pruefeSortenname('   ', sorten, 'de')).toBe('leer');
  });

  it('erkennt doppelte Namen ohne Rücksicht auf Groß-/Kleinschreibung', () => {
    expect(pruefeSortenname(' MEMECİK ', sorten, 'tr')).toBe('doppelt');
    expect(pruefeSortenname('memecik', sorten, 'de')).toBe('doppelt');
  });

  it('erlaubt den eigenen Namen beim Umbenennen und Namen gelöschter Sorten', () => {
    expect(pruefeSortenname('Memecik', sorten, 'de', 'm')).toBeNull();
    expect(pruefeSortenname('Gemlik', sorten, 'de')).toBeNull();
  });
});

describe('naechsteRingfarbe', () => {
  it('nimmt die erste freie Vorschlagsfarbe', () => {
    expect(naechsteRingfarbe([])).toBe(RINGFARBEN_VORSCHLAG[0]);
    expect(naechsteRingfarbe([sorte('1', 'A', RINGFARBEN_VORSCHLAG[0].toUpperCase())])).toBe(RINGFARBEN_VORSCHLAG[1]);
  });

  it('ignoriert gelöschte Sorten', () => {
    expect(naechsteRingfarbe([sorte('1', 'A', RINGFARBEN_VORSCHLAG[0], true)])).toBe(RINGFARBEN_VORSCHLAG[0]);
  });

  it('geht reihum, wenn alle Vorschläge belegt sind', () => {
    const alle = RINGFARBEN_VORSCHLAG.map((f, i) => sorte(String(i), `S${i}`, f));
    expect(naechsteRingfarbe(alle)).toBe(RINGFARBEN_VORSCHLAG[0]);
  });

  it('schlägt nie Weiß vor (reserviert für „ohne Sorte“)', () => {
    expect(RINGFARBEN_VORSCHLAG).not.toContain('#ffffff');
    expect(RINGFARBEN_VORSCHLAG.every(istHexFarbe)).toBe(true);
  });
});

describe('istHexFarbe', () => {
  it('akzeptiert nur #rrggbb', () => {
    expect(istHexFarbe('#1E88e5')).toBe(true);
    expect(istHexFarbe('#fff')).toBe(false);
    expect(istHexFarbe('1e88e5')).toBe(false);
    expect(istHexFarbe('#1e88e5x')).toBe(false);
  });
});

describe('Löschen', () => {
  const baeume = [baum('m'), baum('m'), baum('m', true), baum('x'), baum(null)];

  it('zählt nur aktive Bäume der Sorte', () => {
    expect(zaehleBaeumeMitSorte(baeume, 'm')).toBe(2);
  });

  it('fragt nach, wenn Bäume die Sorte haben', () => {
    expect(pruefeLoeschen(baeume, 'm')).toEqual({ art: 'rueckfrage', anzahlBaeume: 2 });
    expect(pruefeLoeschen(baeume, 'leer')).toEqual({ art: 'direkt' });
  });
});

describe('Farbpalette', () => {
  it('enthält Blau, Magenta, Lila und Braun und hat eindeutige Farben und Namen', () => {
    expect(RINGFARBEN_VORSCHLAG.map((f) => FARB_NAMEN[f]).slice(0, 4)).toEqual(['blau', 'magenta', 'lila', 'braun']);
    expect(new Set(RINGFARBEN_VORSCHLAG).size).toBe(RINGFARBEN_VORSCHLAG.length);
    expect(new Set(Object.values(FARB_NAMEN)).size).toBe(RINGFARBEN_VORSCHLAG.length);
  });

  it('keine Statusfarben (Füllung) in der Palette', () => {
    for (const f of Object.values(STATUS_FARBEN)) expect(RINGFARBEN_VORSCHLAG).not.toContain(f);
  });

  it('farbName findet Palettenfarben ohne Groß-/Kleinschreibung', () => {
    expect(farbName('#7E57C2')).toBe('lila');
    expect(farbName('#123456')).toBeNull();
  });
});
