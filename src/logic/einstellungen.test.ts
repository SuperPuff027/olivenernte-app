import { describe, expect, it } from 'vitest';
import { STANDARD_FUELLSTAND_MAX, STANDARD_ZIEL_GPS_GENAUIGKEIT_M } from './datensatz';
import {
  begrenze,
  FUELLSTAND_MAX_BEREICH,
  istIos,
  schritt,
  speicherHinweis,
  ZIEL_GENAUIGKEIT_BEREICH,
} from './einstellungen';

describe('begrenze', () => {
  it('rundet auf die Schrittweite und hält die Grenzen ein', () => {
    expect(begrenze(4.4, ZIEL_GENAUIGKEIT_BEREICH)).toBe(4.5);
    expect(begrenze(0.2, ZIEL_GENAUIGKEIT_BEREICH)).toBe(1);
    expect(begrenze(99, ZIEL_GENAUIGKEIT_BEREICH)).toBe(20);
    expect(begrenze(7.6, FUELLSTAND_MAX_BEREICH)).toBe(8);
    expect(begrenze(1, FUELLSTAND_MAX_BEREICH)).toBe(2);
  });

  it('ungültige Werte ergeben das Minimum', () => {
    expect(begrenze(Number.NaN, FUELLSTAND_MAX_BEREICH)).toBe(2);
    expect(begrenze(Number.POSITIVE_INFINITY, ZIEL_GENAUIGKEIT_BEREICH)).toBe(1);
  });

  it('die Standardwerte liegen im Bereich', () => {
    expect(begrenze(STANDARD_FUELLSTAND_MAX, FUELLSTAND_MAX_BEREICH)).toBe(STANDARD_FUELLSTAND_MAX);
    expect(begrenze(STANDARD_ZIEL_GPS_GENAUIGKEIT_M, ZIEL_GENAUIGKEIT_BEREICH)).toBe(STANDARD_ZIEL_GPS_GENAUIGKEIT_M);
  });
});

describe('schritt', () => {
  it('einen Schritt hoch und runter, ohne Rundungsfehler', () => {
    expect(schritt(5, 1, ZIEL_GENAUIGKEIT_BEREICH)).toBe(5.5);
    expect(schritt(1.5, -1, ZIEL_GENAUIGKEIT_BEREICH)).toBe(1);
    expect(schritt(5, -1, FUELLSTAND_MAX_BEREICH)).toBe(4);
  });

  it('bleibt an den Grenzen stehen', () => {
    expect(schritt(1, -1, ZIEL_GENAUIGKEIT_BEREICH)).toBe(1);
    expect(schritt(10, 1, FUELLSTAND_MAX_BEREICH)).toBe(10);
  });
});

describe('speicherHinweis', () => {
  it('dauerhaft: kein Hinweis', () => {
    expect(speicherHinweis('dauerhaft', { ios: true, installiert: false })).toBe('keiner');
    expect(speicherHinweis('dauerhaft', { ios: false, installiert: false })).toBe('keiner');
  });

  it('iPhone ohne Installation: Zum Home-Bildschirm', () => {
    expect(speicherHinweis('nicht_dauerhaft', { ios: true, installiert: false })).toBe('ios_home');
    expect(speicherHinweis('nicht_unterstuetzt', { ios: true, installiert: false })).toBe('ios_home');
  });

  it('andere Geräte: installieren, installiert erneut anfragen', () => {
    expect(speicherHinweis('nicht_dauerhaft', { ios: false, installiert: false })).toBe('installieren');
    expect(speicherHinweis('nicht_dauerhaft', { ios: false, installiert: true })).toBe('erneut');
    expect(speicherHinweis('nicht_dauerhaft', { ios: true, installiert: true })).toBe('erneut');
  });

  it('nicht unterstützt und nicht iOS: nichts zu tun', () => {
    expect(speicherHinweis('nicht_unterstuetzt', { ios: false, installiert: false })).toBe('keiner');
  });
});

describe('istIos', () => {
  it('erkennt iPhone und iPad (auch als Mac getarnt)', () => {
    expect(istIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true);
    expect(istIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
  });

  it('Mac ohne Touch und Android sind kein iOS', () => {
    expect(istIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(istIos('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5)).toBe(false);
  });
});
