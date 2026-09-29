import { describe, expect, it } from 'vitest';
import type { Baum, Grundstueck } from '../model/typen';
import { fuellstandOptionen, letzteAenderung, neuerBaum, verschobenerBaum } from './baum';
import { neuerSaisonStatus } from './datensatz';
import { alsPolygon } from './polygon';

// Beliebige Testkoordinaten
const JETZT = new Date('2026-09-29T10:00:00.000Z');
const grundstueck: Grundstueck = {
  id: 'g',
  name: 'Test',
  polygon: alsPolygon([
    [10, 20],
    [10.01, 20],
    [10.01, 20.01],
    [10, 20.01],
  ]),
  aktualisiert_am: JETZT.toISOString(),
  geloescht: false,
};
const vorhanden = (nummer: string): Baum => ({
  id: nummer,
  nummer,
  grundstueck_id: 'g',
  sorte_id: null,
  lat: 20.005,
  lon: 10.005,
  gps_genauigkeit_m: null,
  hoehe_m: null,
  notiz: '',
  aktualisiert_am: JETZT.toISOString(),
  geloescht: false,
});

describe('neuerBaum', () => {
  it('bekommt die nächste Nummer, Position und das Grundstück', () => {
    const { baum, ausserhalb } = neuerBaum([10.005, 20.002], [vorhanden('B-5')], grundstueck, null, JETZT, 'id-1');
    expect(ausserhalb).toBe(false);
    expect(baum).toEqual({
      id: 'id-1',
      nummer: 'B-6',
      grundstueck_id: 'g',
      sorte_id: null,
      lat: 20.002,
      lon: 10.005,
      gps_genauigkeit_m: null,
      hoehe_m: null,
      notiz: '',
      aktualisiert_am: JETZT.toISOString(),
      geloescht: false,
    });
  });

  it('übernimmt GPS-Genauigkeit und Höhe', () => {
    const { baum } = neuerBaum([10.005, 20.002, 55], [], grundstueck, 3.2, JETZT, 'id-1');
    expect(baum).toMatchObject({ nummer: 'B-1', gps_genauigkeit_m: 3.2, hoehe_m: 55 });
  });

  it('außerhalb der Grenze: Hinweis, aber trotzdem dem Grundstück zugeordnet', () => {
    const { baum, ausserhalb } = neuerBaum([10.02, 20.005], [], grundstueck, null, JETZT, 'id-1');
    expect(ausserhalb).toBe(true);
    expect(baum.grundstueck_id).toBe('g');
  });

  it('ohne (aktives) Grundstück: kein Hinweis, keine Zuordnung', () => {
    expect(neuerBaum([10.02, 20.005], [], null, null, JETZT, 'x')).toMatchObject({
      ausserhalb: false,
      baum: { grundstueck_id: null },
    });
    expect(neuerBaum([10.02, 20.005], [], { ...grundstueck, geloescht: true }, null, JETZT, 'x')).toMatchObject({
      ausserhalb: false,
      baum: { grundstueck_id: null },
    });
  });
});

describe('fuellstandOptionen', () => {
  it('1 bis max', () => {
    expect(fuellstandOptionen(5, null)).toEqual([1, 2, 3, 4, 5]);
    expect(fuellstandOptionen(3, 2)).toEqual([1, 2, 3]);
  });

  it('behält einen gespeicherten Wert über max', () => {
    expect(fuellstandOptionen(3, 5)).toEqual([1, 2, 3, 5]);
  });

  it('mindestens ein Knopf, auch bei unsinnigem max', () => {
    expect(fuellstandOptionen(0, null)).toEqual([1]);
    expect(fuellstandOptionen(2.7, null)).toEqual([1, 2]);
  });
});

describe('letzteAenderung', () => {
  const b = { ...vorhanden('B-1'), aktualisiert_am: '2026-09-01T10:00:00.000Z' };

  it('nimmt den jüngeren Zeitpunkt', () => {
    const s = neuerSaisonStatus('B-1', 2026, new Date('2026-09-02T08:00:00.000Z'));
    expect(letzteAenderung(b, s)).toBe('2026-09-02T08:00:00.000Z');
    expect(letzteAenderung({ ...b, aktualisiert_am: '2026-09-03T00:00:00.000Z' }, s)).toBe('2026-09-03T00:00:00.000Z');
  });

  it('ohne oder mit gelöschtem Status: Zeitpunkt des Baums', () => {
    const s = { ...neuerSaisonStatus('B-1', 2026, new Date('2026-09-05T00:00:00.000Z')), geloescht: true };
    expect(letzteAenderung(b, null)).toBe(b.aktualisiert_am);
    expect(letzteAenderung(b, s)).toBe(b.aktualisiert_am);
  });
});

describe('verschobenerBaum', () => {
  const b = { ...vorhanden('B-3'), gps_genauigkeit_m: 2.5, hoehe_m: 55, notiz: 'x', sorte_id: 's' };

  it('setzt die Position, verwirft die GPS-Genauigkeit und behält den Rest', () => {
    const { baum, ausserhalb } = verschobenerBaum(b, [10.006, 20.004], grundstueck, JETZT);
    expect(ausserhalb).toBe(false);
    expect(baum).toEqual({ ...b, lon: 10.006, lat: 20.004, gps_genauigkeit_m: null, aktualisiert_am: JETZT.toISOString() });
  });

  it('meldet eine Position außerhalb des Grundstücks', () => {
    expect(verschobenerBaum(b, [10.02, 20.004], grundstueck, JETZT).ausserhalb).toBe(true);
    expect(verschobenerBaum(b, [10.02, 20.004], null, JETZT).ausserhalb).toBe(false);
  });
});
