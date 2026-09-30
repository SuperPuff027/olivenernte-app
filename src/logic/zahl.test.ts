import { describe, expect, it } from 'vitest';
import type { Sprache } from './sprache';
import { kgFuerEingabe, leseKg, MAX_KG_PRO_BAUM } from './zahl';

const kg = (text: string, sprache: Sprache = 'de') => {
  const e = leseKg(text, sprache);
  return e.ok ? e.kg : e.fehler;
};

describe('leseKg', () => {
  it('Dezimalkomma und -punkt in allen Sprachen', () => {
    for (const sprache of ['de', 'en', 'tr'] as const) {
      expect(kg('12,5', sprache)).toBe(12.5);
      expect(kg('12.5', sprache)).toBe(12.5);
      expect(kg('12', sprache)).toBe(12);
    }
  });

  it('Leerzeichen, Einheit und Kurzformen', () => {
    expect(kg('  12,5 kg ')).toBe(12.5);
    expect(kg('12,5KG')).toBe(12.5);
    expect(kg(',5')).toBe(0.5);
    expect(kg('12,')).toBe(12);
    expect(kg('+3')).toBe(3);
  });

  it('rundet auf 0,1 kg', () => {
    expect(kg('12,34')).toBe(12.3);
    expect(kg('12,35')).toBe(12.4);
    expect(kg('0,04')).toBe(0);
  });

  it('0 kg ist erlaubt (Baum ohne Ertrag)', () => {
    expect(kg('0')).toBe(0);
  });

  it('meldet leer, ungültig, negativ und zu groß', () => {
    expect(kg('')).toBe('leer');
    expect(kg('   ')).toBe('leer');
    expect(kg('kg')).toBe('leer');
    expect(kg('abc')).toBe('ungueltig');
    expect(kg('1,2,3')).toBe('ungueltig');
    expect(kg('1.234,5')).toBe('ungueltig');
    expect(kg(',')).toBe('ungueltig');
    expect(kg('12e3')).toBe('ungueltig');
    expect(kg('1 2')).toBe('ungueltig');
    expect(kg('-4')).toBe('negativ');
    expect(kg(String(MAX_KG_PRO_BAUM + 1))).toBe('zu_gross');
    expect(kg(String(MAX_KG_PRO_BAUM))).toBe(MAX_KG_PRO_BAUM);
  });

  it('Tausendertrennzeichen der Sprache mit drei Ziffern wird nicht still als Dezimalzahl gelesen', () => {
    // Englisch: „1,500“ = 1500 kg → zu groß statt 1,5 kg
    expect(kg('1,500', 'en')).toBe('zu_gross');
    expect(kg('1.500', 'en')).toBe(1.5);
    // Deutsch und Türkisch: „1.500“ = 1500 kg, „1,500“ = 1,5 kg
    expect(kg('1.500', 'de')).toBe('zu_gross');
    expect(kg('1.500', 'tr')).toBe('zu_gross');
    expect(kg('1,500', 'de')).toBe(1.5);
    // Mit anderer Ziffernzahl kein Tausender
    expect(kg('1,50', 'en')).toBe(1.5);
  });
});

describe('kgFuerEingabe', () => {
  it('mit dem Dezimalzeichen der Sprache, ohne Tausendertrennung', () => {
    expect(kgFuerEingabe(12.5, 'de')).toBe('12,5');
    expect(kgFuerEingabe(12.5, 'tr')).toBe('12,5');
    expect(kgFuerEingabe(12.5, 'en')).toBe('12.5');
    expect(kgFuerEingabe(1234, 'de')).toBe('1234');
    expect(kgFuerEingabe(12, 'de')).toBe('12');
  });

  it('lässt sich wieder einlesen', () => {
    for (const sprache of ['de', 'en', 'tr'] as const) {
      for (const wert of [0, 0.5, 12, 38.7, 499.9]) {
        expect(kg(kgFuerEingabe(wert, sprache), sprache)).toBe(wert);
      }
    }
  });
});
