import { describe, expect, it } from 'vitest';
import { fordereDauerhaftenSpeicher } from './speicher';

function speicher(bereits: boolean, gewaehrt: boolean) {
  let angefragt = false;
  return {
    persisted: async () => bereits,
    persist: async () => {
      angefragt = true;
      return gewaehrt;
    },
    get angefragt() {
      return angefragt;
    },
  };
}

describe('fordereDauerhaftenSpeicher', () => {
  it('fragt nicht erneut, wenn der Speicher schon dauerhaft ist', async () => {
    const s = speicher(true, false);
    expect(await fordereDauerhaftenSpeicher(s)).toBe('dauerhaft');
    expect(s.angefragt).toBe(false);
  });

  it('meldet das Ergebnis der Anfrage', async () => {
    expect(await fordereDauerhaftenSpeicher(speicher(false, true))).toBe('dauerhaft');
    expect(await fordereDauerhaftenSpeicher(speicher(false, false))).toBe('nicht_dauerhaft');
  });

  it('kommt ohne Storage-API aus', async () => {
    expect(await fordereDauerhaftenSpeicher(undefined)).toBe('nicht_unterstuetzt');
  });

  it('behandelt Fehler als nicht dauerhaft', async () => {
    const fehler = {
      persisted: async () => {
        throw new Error('blockiert');
      },
      persist: async () => true,
    };
    expect(await fordereDauerhaftenSpeicher(fehler)).toBe('nicht_dauerhaft');
  });
});
