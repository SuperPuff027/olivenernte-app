# Plan Phase 1: Kern-Karte (MVP)

**Stand 2026-09-29:** Alle 19 Schritte umgesetzt, geprüft (`npm run check`, Browsertests) und auf GitHub Pages veröffentlicht. **Offen:** Feldtest im Hain auf Android und iPhone nach `docs/feldtest-phase1.md`; erst danach ist Phase 1 abgeschlossen.

## Kontext
Phase 1 liefert eine installierbare Offline-PWA: Satellitenkarte, Grundstücksgrenze, Bäume eintragen (GPS gemittelt oder per Tipp), Eigenschaften setzen, Farben sehen, Daten überleben einen Neustart, dazu GeoJSON-Export und -Import.

**Testdaten** (`testdaten/hain.geojson`, privat, nicht im Repo): ein Grundstück „Hain“ mit 22 Eckpunkten und die Bäume B-1 bis B-5, alle ohne Sorte. Alle Koordinaten sind 3D (Höhe in m).

**Entscheidungen (mit dem Nutzer geklärt):**
- Hosting über GitHub Pages (gültiges HTTPS, sonst kein Service Worker und kein Offline-Betrieb). Öffentliches Repo `SuperPuff027/olivenernte-app`, Branch `main`.
- `testdaten/` wird nicht veröffentlicht und wurde aus der Git-Historie entfernt.
- GeoJSON-Import: Grundstück und Bäume. Er dient auch zur Wiederherstellung aus dem eigenen Export.
- Neue Bäume bekommen automatisch die nächste freie Nummer (B-6, B-7, …). Die App zeigt die Gesamtzahl der Bäume und die Zahl pro Sorte.
- `hoehe_m` wird optional am Baum gespeichert (Vorbereitung für Phase 5).
- Im Baum-Panel sind Nummer, Sorte, Status und Füllstand direkt editierbar, damit die Daten jedes Baums immer aktuell sind.
- Bäume lassen sich auch per Hand auf der Karte platzieren (Schritte 12 und 16), nicht nur per GPS.
- `fake-indexeddb` für DB-Tests freigegeben.
- App-Name „HRVST“ (Manifest, Kurzname unter dem Icon, Seitentitel, alle drei Sprachen).
- „Eckpunkt an meinem Standort setzen“ per GPS-Mittelung (nach Schritt 15 eingebaut).
- Neue Sorte direkt im Baum-Panel anlegen, Ringfarbe aus einer benannten Palette (Blau, Magenta, Lila, Braun, …).
- Baumpunkte klein halten, damit dicht stehende Bäume sich nicht überdecken.
- Sortenfilter schon in Phase 1 (eigentlich Thema von Phase 2): nicht passende Bäume 60 % durchsichtig, passende 10 % größer.

## Technische Festlegungen
- **UI mit Preact** statt Vanilla-TS: Panel, Sortenverwaltung, Einstellungen und GPS-Dialog sind formularlastig mit viel Zustand. Die Karte bleibt imperativ (MapLibre), Preact steuert nur die Overlays.
- **Keine Draw-Bibliothek.** Das Polygon wird selbst editiert (Tippen fügt Eckpunkt ein, ziehbare Marker, Eckpunkt löschen). Es gibt nur ein Grundstück.
- **Baumpunkte** als `circle`-Layer: `circle-color` = Status, `circle-stroke-color` = Sorte, weißer Ring ohne Sorte. Keine Text-Labels in Phase 1 (bräuchten Glyph-Dateien aus dem Netz); die Nummer steht im Panel.
- **Drag-Korrektur** nur über einen expliziten Modus „Position verschieben“ im Panel. Nach manueller Korrektur `gps_genauigkeit_m = null`.
- **Saison** = aktuelles Kalenderjahr. `SaisonStatus` hat den Schlüssel `[baum_id+jahr]`.
- **Abweichungen vom Datenmodell:** `Baum.sorte_id` darf `null` sein; `Baum.hoehe_m: number | null`; `fuellstand`, `ertrag_kg`, `erntedatum` dürfen `null` sein; Einstellungen haben zusätzlich `sprache`.
- Die `Sensor`-Tabelle existiert nur im Dexie-Schema.
- **Offline-Karte:** Workbox-Runtime-Cache (CacheFirst, eigener Cache-Name, Obergrenze für Einträge) für Esri-Kacheln. „Karte offline speichern“ lädt die Kacheln der Grundstücks-BBox + 100 m Puffer für Zoom 12 bis 18 (höchste Stufe mit echten Luftbildern über dem Hain), mit Anzahl und Fortschritt.
- **Kartenquelle** an einer Stelle (`src/karte/quelle.ts`), damit später ein Orthofoto sie ersetzen kann.
- **Export:** in zwei Schritten (Datei vorbereiten, dann „Teilen oder speichern“), weil iOS das Teilen-Menü nur direkt nach einem Tipp öffnet; daneben immer „Herunterladen“ per Blob-Link.
- **Übersetzungen:** `de.ts` definiert den Schlüssel-Typ, `en.ts` und `tr.ts` sind `Uebersetzung` mit Kopfkommentar „UNGEPRÜFT – von Claude Code erstellt“.

## Schritte
Nach jedem Schritt: `npm run check`, Commit, Push; die GitHub Action baut und veröffentlicht.

- [x] **1. Projektgerüst.** Vite + TS strict + Preact, ESLint, Vitest, `npm run check`, Dev-Skript mit basic-ssl und `--host`.
- [x] **2. i18n.** `src/i18n/de|en|tr.ts` mit Schlüssel-Typ, `t()` mit Platzhaltern, Sprachwahl in `src/logic/sprache.ts`, `Intl`-Formatierer.
- [x] **3. Datenmodell + Dexie.** Typen in `src/model/`, Schema v1, Repository-Funktionen (setzen immer `aktualisiert_am`, löschen nur weich), `navigator.storage.persist()` beim Start.
- [x] **4. PWA-Hülle.** vite-plugin-pwa mit Manifest, Precache, Platzhalter-Icons, iOS-Meta-Tags.
- [x] **5. Karte.** MapLibre mit Esri World Imagery, Attribution, eigene Positionsanzeige, Vollbild mit großen Knöpfen.
- [x] **6. GitHub-Pages-Deploy.** GitHub Action (Check, Build mit `BASE_PATH`, Deploy).
- [x] **7. GeoJSON-Import.** `src/logic/importGeojson.ts` (Grundstück + Bäume, Höhe, Validierung, Vorschau). Vorhandene Baumnummern werden übersprungen.
- [x] **8. Grundstück zeichnen/bearbeiten.** Punkt hinzufügen, verschieben, löschen, Rückgängig; Validierung in `src/logic/polygon.ts` (≥ 3 Punkte, Selbstüberschneidung per Turf `kinks`).
- [x] **9. Offline-Kartencache.** `src/logic/kacheln.ts` zählt die Kacheln, Runtime-Cache im Service Worker, Knopf „Karte offline speichern“ mit Fortschritt.
- [x] **10. Sortenverwaltung.** Sortiert per `localeCompare`, anlegen, umbenennen, Farbwähler; beim Löschen einer vergebenen Sorte Bäume umhängen oder Sorte behalten (`src/logic/sorten.ts`).
- [x] **11. Baumdarstellung.** `src/logic/farben.ts` (Status → Innenfarbe, Sorte → Ring, ohne Status = nicht bereit). Punkte wachsen mit dem Zoom, dunkler Schatten für Kontrast.
- [x] **12. Baum per Tipp eintragen + Nummerierung.** `src/logic/nummern.ts` (höchste B-n + 1, tolerant gegen Varianten wie „B_7“, fremde Formate ignoriert). Modus „Baum eintragen“: jeder Tipp legt einen Baum an, Rückgängig, Doppeltipp-Zoom aus. Außerhalb des Grundstücks Hinweis (Turf `booleanPointInPolygon`), gespeichert wird trotzdem.
- [x] **13. Baum-Panel (Anzeigen + Bearbeiten).** Ein Tipp auf einen Punkt öffnet das Panel. Jeder Wert lässt sich direkt ändern:
  - **Nummer:** Textfeld. Ist die Nummer schon vergeben, erscheint ein Hinweis und nichts wird gespeichert (Prüfung in `src/logic/nummern.ts`, mit Tests).
  - **Sorte:** Auswahlliste aller Sorten (plus „ohne Sorte“), mit Farbpunkt.
  - **Status:** drei große Umschalt-Knöpfe in den Punktfarben.
  - **Füllstand:** Knöpfe 1…`fuellstand_max` plus „leer“.
  - **Notiz:** Textfeld.
  - **Nur zur Anzeige:** Koordinaten, GPS-Genauigkeit, Höhe.

  - **Nachtrag:** Neue Sorte direkt im Panel anlegen, Ringfarbe aus einer benannten Palette (Blau, Magenta, Lila, Braun, Gelb, Orange, Türkis, Rosa, Dunkelblau, Schwarz) wählen und ändern.

  Jede Änderung wird sofort gespeichert (ohne Speichern-Knopf), setzt `aktualisiert_am`, die Karte zeigt sofort die neue Farbe. Status und Füllstand schreiben in den `SaisonStatus` des aktuellen Jahres (fehlt er, wird er angelegt). Anzeige „zuletzt geändert: …“ per `Intl`. Baum löschen (weich, mit Rückfrage).
- [x] **14. Zähler.** „Bäume gesamt: n“ plus Zahl pro Sorte (inkl. „ohne Sorte“), Zählung in `src/logic/statistik.ts` mit Tests.
  - **Nachtrag:** Sortenfilter in der Übersicht: Sorte antippen hebt sie hervor (10 % größer), alle anderen Bäume werden 60 % durchsichtig; Anzeige und ✕ neben dem Zähler.
  - **Nachtrag:** Filter auch nach Status (nicht bereit / bereit / geerntet), mit Sorte kombinierbar; Übersicht zeigt die Anzahl je Status, die Filteranzeige die Trefferzahl.
- [x] **15. GPS-Mittelung.** `src/logic/gpsMittel.ts`: gewichtetes Mittel (1/acc²), konservative Genauigkeit, Mindestzahl Fixes, Ausreißer verwerfen, Stopp-Kriterium (mit Tests). UI „Baum hier eintragen“ mit `watchPosition`, Live-Genauigkeit, Anzahl Fixes, „Übernehmen“ und „Abbrechen“.
  - Umsetzung: Der „+“-Knopf fragt „Hier per GPS“ oder „Per Tipp auf die Karte“. Nach dem Übernehmen öffnet sich das Panel des neuen Baums. Die GPS-Höhe wird nicht gespeichert (Android: Ellipsoid, iOS: Meeresspiegel).
  - [x] **Danach:** „Eckpunkt an meinem Standort setzen“ in der Grenzbearbeitung, mit derselben GPS-Mittelung (ohne Auswahl neuer Punkt an der nächsten Kante, mit Auswahl wird der gewählte Punkt ersetzt).
- [x] **16. Position per Drag korrigieren.** Modus „Position verschieben“ im Panel mit Speichern und Abbrechen.
- [x] **17. Einstellungen.** Sprache, `fuellstand_max`, `ziel_gps_genauigkeit_m`, Anzeige ob der Speicher dauerhaft ist (mit iOS-Hinweis „Zum Home-Bildschirm“).
  - Umsetzung: Sprache wirkt sofort ohne Neuladen; Füllstand 2–10, Zielgenauigkeit 1–20 m in 0,5-m-Schritten (−/+-Knöpfe); Speicher: dauerhaft ja/nein, installiert ja/nein, Belegung, „erneut anfragen“.
- [x] **18. GeoJSON-Export.** `src/logic/exportGeojson.ts` inkl. Sorten und Saisonstatus; Test: Export und anschließender Import ergeben dieselben Daten. Teilen per Share-Sheet, sonst Download.
- [x] **19. Feldtest-Vorbereitung.** Checkliste in `docs/feldtest-phase1.md`: installieren, Karte offline speichern, Flugmodus, Bäume eintragen, App beenden und neu öffnen, Export. Erst Android, vor Abschluss auch iPhone.

## Verifikation
- Nach jedem Schritt `npm run check` (Typecheck, Lint, Vitest).
- Im Browser (Dev-Server per LAN-IP und HTTPS, oder GitHub-Pages-Version): Import zeigt Polygon und Bäume, ein neuer Baum bekommt die nächste Nummer, Sortenänderung ändert die Ringfarbe, der Zähler stimmt.
- Offline-Test auf der GitHub-Pages-Version: Karte speichern, Flugmodus an, App neu starten; Kacheln und Daten sind da.
- Fertig laut `docs/phasen.md`: Feldtest im Hain auf Android und iPhone.
