# Olivenernte-App

Offline-fähige Karten-App (PWA) für einen Olivenhain in der Türkei. Jeder Baum ist ein Punkt mit GPS-Position, Sorte, Füllstand und Erntestatus. Genutzt auf iPhone und Android, im Feld oft ohne Empfang.

**Aktuelle Phase: 1** (Details aller Phasen: `docs/phasen.md`; nur den Abschnitt der aktuellen Phase lesen)

## Arbeitsweise
- Nur die aktuelle Phase umsetzen. Spätere Phasen nur im Datenmodell vorbereiten, keinen Code dafür schreiben.
- Zu Beginn jeder Phase einen Plan vorlegen; Code erst nach Freigabe.
- Kleine Schritte. Nach jedem Schritt `npm run check` ausführen, dann committen.
- Reine Logik (Farbzuordnung, Status, Filter, GPS-Mittelung, später Saisonwechsel und Interpolation) liegt in `src/logic/` ohne UI-Abhängigkeiten und hat Vitest-Tests.
- Keine Koordinaten oder Baumdaten erfinden. Echte Daten liegen in `testdaten/`. Fehlen sie, nachfragen.
- `testdaten/` ist privat und nicht im (öffentlichen) Repo. Echte Koordinaten nie in Code, Tests oder Commits übernehmen; Tests, die `testdaten/` brauchen, überspringen sich, wenn der Ordner fehlt (z. B. in CI).
- Keine neuen Abhängigkeiten außerhalb des Stacks ohne Rückfrage.

## Stack (festgelegt)
- Vite + TypeScript (strict), `vite-plugin-pwa` (Service Worker, installierbar)
- MapLibre GL JS (später 3D-Terrain ohne Bibliothekswechsel)
- Dexie (IndexedDB) für lokale Daten; beim Start `navigator.storage.persist()` anfordern
- Turf.js für Geometrie
- Vitest für Tests
- Kein UI-Framework-Zwang: schlankes Vanilla-TS oder Preact, im Plan von Phase 1 begründen
- `npm run check` = Typecheck + Lint + Tests

## Entwicklung auf dem Handy
- GPS im Browser braucht HTTPS: Dev-Server mit `@vitejs/plugin-basic-ssl` und `--host`, Aufruf per LAN-IP.
- iOS: App über Safari → „Zum Home-Bildschirm“ installieren, nur dann ist der Speicher dauerhaft.
- Alles muss auf iOS Safari und Android Chrome laufen. Keine Web-APIs nutzen, die iOS nicht kann (u. a. Web-Bluetooth, Web-Serial), außer in klar optionalen, Android-only Funktionen ab Phase 4.

## UI
- Sprachen: Deutsch, Englisch, Türkisch. Alle Texte über Übersetzungsdateien (`src/i18n/de.ts`, `en.ts`, `tr.ts`) mit gemeinsamem Schlüssel-Typ, damit fehlende Übersetzungen ein Typfehler sind. Keine UI-Texte direkt im Code.
- Sprache in den Einstellungen umschaltbar und gespeichert; Standard = Gerätesprache, sonst Deutsch.
- Zahlen- und Datumsformat pro Sprache über `Intl` (z. B. Dezimalkomma bei kg).
- Türkische Groß-/Kleinschreibung beachten (i/İ, ı/I): `toLocaleUpperCase('tr')` statt `toUpperCase()`, ebenso bei Sortierung und Suche (`localeCompare` mit Sprache).
- Übersetzungen, die Claude Code selbst schreibt, als ungeprüft markieren; Türkisch wird von Muttersprachlern gegengelesen.
- Große Touch-Ziele (Feldeinsatz, Handschuhe, Sonne), hoher Kontrast.

## Datenmodell
Alle IDs sind UUIDs. Alle Datensätze haben `aktualisiert_am` (ISO-Zeit) und `geloescht` (bool, Soft-Delete), damit später mehrere Geräte synchronisiert werden können.

- **Grundstück:** id, name, polygon (GeoJSON-Polygon)
- **Sorte:** id, name, ringfarbe (Hex). Beliebig viele, vom Nutzer in der App verwaltet; nichts fest im Code.
- **Baum:** id, nummer (kurz, sichtbar, z. B. „B-17“), grundstueck_id, sorte_id, lat, lon, gps_genauigkeit_m, notiz
- **SaisonStatus:** baum_id, jahr, status (`nicht_bereit` | `bereit` | `geerntet`), fuellstand (1–5, vor der Ernte geschätzt), ertrag_kg, erntedatum
  - Status gehört zur Saison, nicht zum Baum, damit die Historie erhalten bleibt.
- **Einstellungen:** fuellstand_max (Standard 5), ziel_gps_genauigkeit_m (Standard 5)
- **Sensor (ab Phase 4, nur Schema):** id, lat, lon, messwerte (zeitstempel, wert)

## Darstellung der Baumpunkte
- Innenfarbe = status: `bereit` grün, `nicht_bereit` rot, `geerntet` grau
- Ring = Farbe der Sorte
- Filter: nicht passende Bäume werden halbtransparent, nicht ausgeblendet

## GPS-Erfassung
- „Baum hier eintragen“ sammelt mehrere Fixes und mittelt sie, bis `ziel_gps_genauigkeit_m` erreicht ist oder der Nutzer abbricht. Aktuelle Genauigkeit anzeigen.
- Genauigkeit am Baum speichern.
- Punkte lassen sich per Drag korrigieren.
- Alternative: Eintragen per Tipp auf die Karte.

## Karte
- Start: Esri World Imagery als Kachel-Layer. Offline-Cache nur für die Bounding-Box des Grundstücks und wenige Zoomstufen; keine Massen-Downloads.
- Kartenquelle austauschbar halten (später eigenes Drohnen-Orthofoto als GeoTIFF/Kacheln).
