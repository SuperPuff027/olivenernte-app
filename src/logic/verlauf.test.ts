import { describe, expect, it } from 'vitest';
import type { SaisonStatus } from '../model/typen';
import { baumVerlauf } from './verlauf';

const eintrag = (jahr: number, weitere: Partial<SaisonStatus> = {}): SaisonStatus => ({
  baum_id: 'b-1',
  jahr,
  status: 'geerntet',
  fuellstand: 3,
  ertrag_kg: 20,
  erntedatum: `${jahr}-11-01`,
  aktualisiert_am: '2026-01-01T00:00:00.000Z',
  geloescht: false,
  ...weitere,
});

describe('baumVerlauf', () => {
  it('neueste Saison zuerst, ohne gelöschte Einträge', () => {
    const v = baumVerlauf([eintrag(2024), eintrag(2026), eintrag(2025, { geloescht: true }), eintrag(2023)], null);
    expect(v.map((s) => s.jahr)).toEqual([2026, 2024, 2023]);
  });

  it('der bearbeitete Eintrag ersetzt den geladenen desselben Jahres', () => {
    const v = baumVerlauf([eintrag(2026, { ertrag_kg: 20 }), eintrag(2025)], eintrag(2026, { ertrag_kg: 31 }));
    expect(v.map((s) => `${s.jahr}:${s.ertrag_kg}`)).toEqual(['2026:31', '2025:20']);
  });

  it('ein neu angelegter Eintrag erscheint, auch ohne geladene', () => {
    expect(baumVerlauf([], eintrag(2027, { status: 'bereit' })).map((s) => s.jahr)).toEqual([2027]);
    expect(baumVerlauf([], null)).toEqual([]);
  });
});
