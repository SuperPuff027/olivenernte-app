import { describe, expect, it } from 'vitest';
import { belegterSpeicher, fordereDauerhaftenSpeicher, pruefeSpeicher } from './speicher';

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

describe('pruefeSpeicher', () => {
  it('fragt nur ab, ohne zu bitten', async () => {
    const s = speicher(false, true);
    expect(await pruefeSpeicher(s)).toBe('nicht_dauerhaft');
    expect(s.angefragt).toBe(false);
    expect(await pruefeSpeicher(speicher(true, false))).toBe('dauerhaft');
  });

  it('ohne API oder bei Fehlern', async () => {
    expect(await pruefeSpeicher(undefined)).toBe('nicht_unterstuetzt');
    expect(await pruefeSpeicher({ persisted: () => Promise.reject(new Error('x')) })).toBe('nicht_dauerhaft');
  });
});

describe('belegterSpeicher', () => {
  it('liefert die Belegung oder null', async () => {
    expect(await belegterSpeicher({ estimate: async () => ({ usage: 1234, quota: 10 ** 9 }) })).toBe(1234);
    expect(await belegterSpeicher({ estimate: async () => ({}) })).toBeNull();
    expect(await belegterSpeicher(undefined)).toBeNull();
    expect(await belegterSpeicher({ estimate: () => Promise.reject(new Error('x')) })).toBeNull();
  });
});
