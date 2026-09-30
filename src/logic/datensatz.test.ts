import { describe, expect, it } from 'vitest';
import {
  alsGeloescht,
  geaendert,
  neueId,
  neuerSaisonStatus,
  nurAktive,
  saisonJahr,
  hainAusAltenEinstellungen,
  standardEinstellungen,
  standardHainEinstellungen,
} from './datensatz';

const ZEIT = new Date('2026-10-05T11:30:00Z');
const FRUEHER = '2026-01-01T00:00:00.000Z';

describe('neueId', () => {
  it('erzeugt eindeutige UUIDs', () => {
    const a = neueId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(neueId()).not.toBe(a);
  });
});

describe('geaendert', () => {
  it('setzt aktualisiert_am und lässt das Original unverändert', () => {
    const original = { name: 'x', aktualisiert_am: FRUEHER, geloescht: false };
    const neu = geaendert(original, ZEIT);
    expect(neu.aktualisiert_am).toBe('2026-10-05T11:30:00.000Z');
    expect(neu.name).toBe('x');
    expect(original.aktualisiert_am).toBe(FRUEHER);
  });
});

describe('alsGeloescht / nurAktive', () => {
  it('löscht weich und filtert gelöschte Datensätze', () => {
    const a = { id: 'a', aktualisiert_am: FRUEHER, geloescht: false };
    const b = alsGeloescht({ id: 'b', aktualisiert_am: FRUEHER, geloescht: false }, ZEIT);
    expect(b.geloescht).toBe(true);
    expect(b.aktualisiert_am).toBe(ZEIT.toISOString());
    expect(nurAktive([a, b])).toEqual([a]);
  });
});

describe('Standardwerte', () => {
  it('Einstellungen: GPS-Ziel 5 m, Gerätesprache', () => {
    const e = standardEinstellungen(ZEIT);
    expect(e.ziel_gps_genauigkeit_m).toBe(5);
    expect(e.sprache).toBeNull();
  });

  it('neuer Saisonstatus ist nicht bereit und ohne Füllstand', () => {
    const s = neuerSaisonStatus('baum-1', 2026, ZEIT);
    expect(s).toMatchObject({ baum_id: 'baum-1', jahr: 2026, status: 'nicht_bereit' });
    expect(s.fuellstand).toBeNull();
    expect(s.geloescht).toBe(false);
  });

  it('Saison ist das Kalenderjahr', () => {
    expect(saisonJahr(new Date(2026, 10, 20))).toBe(2026);
  });
});

describe('Hain-Einstellungen', () => {
  it('Standard: Saison = Jahr des Zeitpunkts, Füllstand max 5', () => {
    expect(standardHainEinstellungen(ZEIT)).toEqual({
      id: 'hain',
      aktuelle_saison: ZEIT.getFullYear(),
      fuellstand_max: 5,
      aktualisiert_am: ZEIT.toISOString(),
      geloescht: false,
    });
  });

  it('Migration übernimmt fuellstand_max aus den alten Geräte-Einstellungen', () => {
    expect(hainAusAltenEinstellungen({ id: 'einstellungen', fuellstand_max: 7 }, ZEIT).fuellstand_max).toBe(7);
  });

  it('Migration: fehlende oder ungültige Werte ergeben den Standard', () => {
    for (const alt of [undefined, null, {}, { fuellstand_max: 0 }, { fuellstand_max: 2.5 }, { fuellstand_max: '7' }]) {
      expect(hainAusAltenEinstellungen(alt, ZEIT)).toEqual(standardHainEinstellungen(ZEIT));
    }
  });
});
