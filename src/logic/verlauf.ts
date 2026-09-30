import type { SaisonStatus } from '../model/typen';

/**
 * Verlauf eines Baums über alle Saisons, neueste zuerst. `aktuell` ist der gerade im Panel
 * bearbeitete Eintrag; er ersetzt den geladenen Eintrag desselben Jahres, damit Änderungen sofort
 * im Verlauf erscheinen. Gelöschte Einträge fehlen.
 */
export function baumVerlauf(geladen: readonly SaisonStatus[], aktuell: SaisonStatus | null): SaisonStatus[] {
  const nachJahr = new Map<number, SaisonStatus>();
  for (const s of geladen) if (!s.geloescht) nachJahr.set(s.jahr, s);
  if (aktuell) {
    if (aktuell.geloescht) nachJahr.delete(aktuell.jahr);
    else nachJahr.set(aktuell.jahr, aktuell);
  }
  return [...nachJahr.values()].sort((a, b) => b.jahr - a.jahr);
}
