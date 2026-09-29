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
});
