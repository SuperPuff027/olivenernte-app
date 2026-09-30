# Plan Phase 2: Filter und Ernteworkflow

**Ziel laut `docs/phasen.md`:** Während der Ernte werden gezielt die nächsten bereiten Bäume einer Sorte gefunden.

**Stand 2026-09-30:** Alle 8 Schritte und die Nachträge (Ortsnamen) umgesetzt und veröffentlicht. **Offen:** Feldtest nach `docs/feldtest-phase2.md` (Android, dann iPhone); erst danach ist Phase 2 abgeschlossen. Der Feldtest von Phase 1 (`docs/feldtest-phase1.md`) steht noch aus und läuft parallel; Befunde daraus haben Vorrang.

## Schon in Phase 1 vorgezogen
- Filter nach Sorte und Status, kombinierbar, mit Trefferzahl (`src/logic/filter.ts`)
- Übersicht mit Anzahl je Status und je Sorte (`src/logic/statistik.ts`)
- `ertrag_kg` und `erntedatum` im Datenmodell, in Export und Import

## Entscheidungen
- Phase 2 beginnt vor dem Feldtest von Phase 1 (parallel).
- Ertrag wird **pro Baum** in kg erfasst (wie im Datenmodell).
- Füllstand-Filter: Bäume ohne Schätzung passen nicht, solange ein Bereich gesetzt ist.
- Kein neues Datenmodell, keine neuen Abhängigkeiten. Entfernungen offline über `abstandM`.

## Schritte
Nach jedem Schritt: `npm run check`, Commit, Push; die GitHub Action baut und veröffentlicht.

- [x] **1. Füllstand-Bereich im Filter.** `BaumFilter.fuellstand: { von, bis } | null` in `src/logic/filter.ts` (mit Tests). Übersicht: Abschnitt „Füllstand“ mit −/+-Wählern „von … bis …“ und „egal“; Filteranzeige z. B. „Memecik · Bereit · Füllstand 3–5 (4)“.
- [x] **2. Filter merken.** Der Filter übersteht einen App-Neustart (localStorage, nur dieses Gerät, nicht im Export).
- [x] **3. Kg-Eingabe.** `src/logic/zahl.ts` liest „12,5“ / „12.5“ / „12“, lehnt Negatives und Unsinn ab, Obergrenze pro Baum; Tests für de/en/tr.
- [x] **4. „Geerntet“ speichern.** `markiereGeerntet(baum, jahr, kg | null)`: Status geerntet, Erntedatum heute, Ertrag; Ertrag später änderbar. Zurücksetzen von „geerntet“ behält Ertrag und Datum, sie zählen dann aber nicht zum Gesamtertrag. Tests.
- [x] **5. Schnellaktion im Baum-Panel.** Tipp auf „Geerntet“ öffnet ein großes Zahlenfeld (`inputmode="decimal"`) mit Erntedatum (heute, änderbar, nicht in der Zukunft), „Geerntet speichern“, „Ohne Menge“ und „Abbrechen“. Geerntete Bäume zeigen Ertrag und Erntedatum mit „Ertrag oder Datum ändern“. Der Knopf „Nächster passender Baum →“ kommt mit Schritt 7.
- [x] **6. Ertrag in der Übersicht.** Gesamtertrag der Saison, Ertrag pro Sorte, „geerntet n von m“, davon ohne Mengenangabe (`statistik.ts`, Tests).
- [x] **7. Nächste passende Bäume.** `src/logic/naechste.ts`: passende Bäume nach Entfernung sortiert, mit Meter und Himmelsrichtung (Tests). Bezugspunkt: eigener Standort (Knopf „Nächste“ neben der Filteranzeige, Liste der 5 nächsten) oder der gerade geerntete Baum (Knopf im Panel, ohne GPS). Tipp auf einen Eintrag zentriert die Karte und öffnet das Panel. Umsetzung: Geerntete Bäume werden immer übersprungen, außer beim Filter „Geerntet“; „Nächster passender Baum →“ steht im Panel geernteter Bäume.
- [x] **8. Feldtest-Checkliste Phase 2** in `docs/feldtest-phase2.md`.

## Nachträge
- [x] **Ortsnamen auf der Karte** (Wunsch des Nutzers, wie bei geojson.io): Esri „World Boundaries and Places“ als transparente Rasterebene über dem Luftbild; je nach Zoom mehr oder weniger Orte, ab Zoom 17 ausgeblendet; beim Offline-Speichern mitgeladen (eigener Cache).
