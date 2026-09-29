import { describe, expect, it } from 'vitest';
import { enthaelt, grossschreiben, kleinschreiben, vergleiche } from './text';

describe('türkische Groß-/Kleinschreibung', () => {
  it('schreibt i im Türkischen zu İ groß', () => {
    expect(grossschreiben('ayvalık', 'tr')).toBe('AYVALIK');
    expect(grossschreiben('memecik', 'tr')).toBe('MEMECİK');
    expect(grossschreiben('memecik', 'de')).toBe('MEMECIK');
  });

  it('schreibt I im Türkischen zu ı klein', () => {
    expect(kleinschreiben('AYVALIK', 'tr')).toBe('ayvalık');
    expect(kleinschreiben('İZMİR', 'tr')).toBe('izmir');
  });

  it('findet Suchbegriffe sprachrichtig', () => {
    expect(enthaelt('MEMECİK', 'memecik', 'tr')).toBe(true);
    expect(enthaelt('Ayvalık', 'ALIK', 'tr')).toBe(true);
    expect(enthaelt('Gemlik', ' gem ', 'de')).toBe(true);
    expect(enthaelt('Gemlik', 'xyz', 'de')).toBe(false);
  });
});

describe('vergleiche', () => {
  it('sortiert türkische Buchstaben nach türkischem Alphabet', () => {
    const namen = ['Zeytin', 'Çakır', 'Cevat', 'Dilek'];
    expect([...namen].sort((a, b) => vergleiche(a, b, 'tr'))).toEqual([
      'Cevat',
      'Çakır',
      'Dilek',
      'Zeytin',
    ]);
  });

  it('sortiert Zahlen in Namen numerisch', () => {
    const nummern = ['B-10', 'B-2', 'B-1'];
    expect([...nummern].sort((a, b) => vergleiche(a, b, 'de'))).toEqual(['B-1', 'B-2', 'B-10']);
  });
});
