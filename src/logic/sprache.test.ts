import { describe, expect, it } from 'vitest';
import { ermittleSprache } from './sprache';

describe('ermittleSprache', () => {
  it('nimmt die gespeicherte Sprache', () => {
    expect(ermittleSprache('tr', ['de-DE'])).toBe('tr');
  });

  it('ignoriert ungültige gespeicherte Werte', () => {
    expect(ermittleSprache('fr', ['en-GB'])).toBe('en');
  });

  it('nimmt die erste unterstützte Gerätesprache', () => {
    expect(ermittleSprache(null, ['fr-FR', 'tr-TR', 'de-DE'])).toBe('tr');
  });

  it('erkennt Sprachcodes unabhängig von Groß-/Kleinschreibung', () => {
    expect(ermittleSprache(undefined, ['EN-us'])).toBe('en');
  });

  it('fällt auf Deutsch zurück', () => {
    expect(ermittleSprache(null, ['fr-FR', 'es'])).toBe('de');
    expect(ermittleSprache(null, [])).toBe('de');
  });
});
