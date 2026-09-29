import { describe, expect, it } from 'vitest';
import { pruefeAnsicht } from './ansicht';

describe('pruefeAnsicht', () => {
  it('übernimmt gültige Werte', () => {
    expect(pruefeAnsicht({ lon: 10.5, lat: 20.25, zoom: 17 })).toEqual({
      lon: 10.5,
      lat: 20.25,
      zoom: 17,
    });
  });

  it('verwirft fehlende, falsche oder unmögliche Werte', () => {
    expect(pruefeAnsicht(null)).toBeNull();
    expect(pruefeAnsicht('x')).toBeNull();
    expect(pruefeAnsicht({ lon: 10, lat: 20 })).toBeNull();
    expect(pruefeAnsicht({ lon: '10', lat: 20, zoom: 17 })).toBeNull();
    expect(pruefeAnsicht({ lon: 200, lat: 20, zoom: 17 })).toBeNull();
    expect(pruefeAnsicht({ lon: 10, lat: 95, zoom: 17 })).toBeNull();
    expect(pruefeAnsicht({ lon: 10, lat: 20, zoom: Number.NaN })).toBeNull();
  });
});
