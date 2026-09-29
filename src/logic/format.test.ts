import { describe, expect, it } from 'vitest';
import {
  formatiereDatum,
  formatiereGrad,
  formatiereKg,
  formatiereMeter,
  formatiereZahl,
  formatiereZeitpunkt,
} from './format';

// Intl verwendet teils geschützte Leerzeichen; für den Vergleich vereinheitlichen.
const norm = (s: string) => s.replace(/\s/g, ' ');

describe('Zahlenformat pro Sprache', () => {
  it('nutzt Dezimalkomma in Deutsch und Türkisch', () => {
    expect(formatiereZahl(12.5, 'de', 1)).toBe('12,5');
    expect(formatiereZahl(12.5, 'tr', 1)).toBe('12,5');
    expect(formatiereZahl(12.5, 'en', 1)).toBe('12.5');
  });

  it('formatiert Kilogramm', () => {
    expect(norm(formatiereKg(23.45, 'de'))).toBe('23,5 kg');
    expect(norm(formatiereKg(23.45, 'en'))).toBe('23.5 kg');
    expect(norm(formatiereKg(23.45, 'tr'))).toBe('23,5 kg');
  });

  it('formatiert Meter', () => {
    expect(norm(formatiereMeter(3.21, 'de'))).toBe('3,2 m');
    expect(norm(formatiereMeter(3, 'en'))).toBe('3 m');
  });

  it('formatiert Koordinaten mit 6 Stellen ohne Tausendertrennung', () => {
    expect(formatiereGrad(12.3456789, 'de')).toBe('12,345679');
    expect(formatiereGrad(45.6789, 'en')).toBe('45.678900');
  });
});

describe('Datumsformat pro Sprache', () => {
  it('formatiert ein Datum', () => {
    expect(norm(formatiereDatum('2026-10-05', 'de'))).toBe('05.10.2026');
    expect(norm(formatiereDatum('2026-10-05', 'en'))).toBe('Oct 5, 2026');
    expect(norm(formatiereDatum('2026-10-05', 'tr'))).toBe('5 Eki 2026');
  });

  it('formatiert einen Zeitpunkt in der angegebenen Zeitzone', () => {
    expect(norm(formatiereZeitpunkt('2026-10-05T11:30:00Z', 'de', 'Europe/Istanbul'))).toBe(
      '05.10.2026, 14:30',
    );
  });
});
