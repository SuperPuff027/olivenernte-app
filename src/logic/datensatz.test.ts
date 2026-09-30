import { describe, expect, it } from 'vitest';
import {
  alsGeloescht,
  geaendert,
  neueId,
  neuerSaisonStatus,
  nurAktive,
  saisonAuswahl,
  saisonJahr,
  saisonwechselFaellig,
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

  it('Saison = Jahr des Erntebeginns: ab Mai das laufende Jahr, davor das Vorjahr', () => {
    expect(saisonJahr(new Date(2026, 10, 20))).toBe(2026);
    expect(saisonJahr(new Date(2026, 4, 1))).toBe(2026);
    // Ernte im Januar/Februar gehört noch zur Saison des Vorjahres
    expect(saisonJahr(new Date(2027, 0, 15))).toBe(2026);
    expect(saisonJahr(new Date(2027, 3, 30))).toBe(2026);
  });

  it('Saisonwechsel wird erst ab Mai vorgeschlagen', () => {
    expect(saisonwechselFaellig(2026, new Date(2026, 11, 1))).toBe(false);
    expect(saisonwechselFaellig(2026, new Date(2027, 1, 10))).toBe(false);
    expect(saisonwechselFaellig(2026, new Date(2027, 4, 2))).toBe(true);
    expect(saisonwechselFaellig(2027, new Date(2027, 4, 2))).toBe(false);
    // Nach einem Wechsel „zu früh“ kein erneuter Vorschlag
    expect(saisonwechselFaellig(2028, new Date(2027, 8, 1))).toBe(false);
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

describe('saisonAuswahl', () => {
  it('Saisons mit Daten und die aktuelle, neueste zuerst, ohne Doppelte', () => {
    expect(saisonAuswahl([2024, 2026, 2025, 2026], 2026)).toEqual([2026, 2025, 2024]);
    expect(saisonAuswahl([2024], 2027)).toEqual([2027, 2024]);
    expect(saisonAuswahl([], 2026)).toEqual([2026]);
  });
});
