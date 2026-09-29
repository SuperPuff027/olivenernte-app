import { describe, expect, it } from 'vitest';
import { de } from './de';
import { en } from './en';
import { tr } from './tr';
import { erstelleUebersetzer } from './index';

describe('Übersetzungen', () => {
  it('haben in allen Sprachen genau dieselben Schlüssel', () => {
    const schluessel = Object.keys(de).sort();
    expect(Object.keys(en).sort()).toEqual(schluessel);
    expect(Object.keys(tr).sort()).toEqual(schluessel);
  });

  it('enthalten keine leeren Texte', () => {
    for (const texte of [de, en, tr]) {
      for (const text of Object.values(texte)) expect(text.trim()).not.toBe('');
    }
  });
});

describe('erstelleUebersetzer', () => {
  it('liefert den Text der gewählten Sprache', () => {
    expect(erstelleUebersetzer('de')('status.bereit')).toBe('Bereit');
    expect(erstelleUebersetzer('tr')('status.bereit')).toBe('Hazır');
  });

  it('setzt Platzhalter ein und lässt unbekannte stehen', () => {
    const t = erstelleUebersetzer('de');
    expect(t('import.baeume', { n: 5 })).toBe('Neue Bäume: 5');
    expect(t('import.baeume')).toBe('Neue Bäume: {n}');
    expect(t('import.baeume', { x: 1 })).toBe('Neue Bäume: {n}');
  });

  it('verwendet in allen Sprachen dieselben Platzhalter', () => {
    const platzhalter = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const schluessel of Object.keys(de) as (keyof typeof de)[]) {
      expect(platzhalter(en[schluessel]), `en: ${schluessel}`).toEqual(platzhalter(de[schluessel]));
      expect(platzhalter(tr[schluessel]), `tr: ${schluessel}`).toEqual(platzhalter(de[schluessel]));
    }
  });
});
