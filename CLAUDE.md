# Olivenernte-App („HRVST“)

Offline-fähige Karten-App (PWA) für einen Olivenhain in der Türkei. Jeder Baum ist ein Punkt mit GPS-Position, Sorte, Füllstand und Erntestatus. Genutzt auf iPhone und Android, im Feld oft ohne Empfang.

**Aktuelle Phase: 1** – alle Schritte umgesetzt, Feldtest auf Android und iPhone steht aus (`docs/feldtest-phase1.md`). (Details aller Phasen: `docs/phasen.md`; nur den Abschnitt der aktuellen Phase lesen). Plan und Fortschritt von Phase 1: `docs/plan-phase1.md` (erledigte Schritte dort abhaken).

## Arbeitsweise
- Nur die aktuelle Phase umsetzen. Spätere Phasen nur im Datenmodell vorbereiten, keinen Code dafür schreiben.
- Zu Beginn jeder Phase einen Plan vorlegen; Code erst nach Freigabe.
- Kleine Schritte. Nach jedem Schritt `npm run check` ausführen, dann committen, pushen und warten, bis die GitHub Action (Check, Build, Deploy auf GitHub Pages) grün ist.
- Antworten an den Nutzer auf Deutsch.
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

## Entscheidungen aus Phase 1
- **Name:** App heißt „HRVST“ (Manifest `name`/`short_name`, Seitentitel, Schlüssel `app.titel`). Das Repo und die Dexie-Datenbank heißen weiter `olivenernte`.
- **Hosting:** GitHub Pages, öffentliches Repo `SuperPuff027/olivenernte-app`, Branch `main`. Der Base-Pfad kommt aus `BASE_PATH` (in der Action gesetzt). Commits nur mit der GitHub-noreply-Adresse.
- **UI:** Preact für Overlays und Formulare; die Karte bleibt imperativ (MapLibre, `src/karte/`). Große Knöpfe (`--touch-min: 56px`).
- **Abhängigkeiten:** zusätzlich freigegeben `fake-indexeddb` (DB-Tests). Turf nur als Einzelmodule (`@turf/bbox`, `@turf/kinks`, `@turf/boolean-point-in-polygon`).
- **Datenmodell-Abweichungen:** `Baum.sorte_id`, `fuellstand`, `ertrag_kg`, `erntedatum` dürfen `null` sein; `Baum.hoehe_m` (optional, aus GeoJSON-Höhe); Einstellungen haben `sprache` (`null` = Gerätesprache). `SaisonStatus` hat den Schlüssel `[baum_id+jahr]`; Saison = Kalenderjahr.
- **Ein Grundstück.** Bäume gehören zu ihm, auch wenn sie außerhalb der Grenze liegen (dann nur ein Hinweis).
- **Baumnummern:** Format `B-n`. Neue Bäume bekommen die höchste B-Nummer unter den aktiven Bäumen + 1 (Lücken bleiben frei, Varianten wie „B_7“ zählen mit, fremde Formate werden ignoriert). Nummern sind eindeutig; der Import überspringt vorhandene.
- **Darstellung:** Baum ohne Saisonstatus = `nicht_bereit` (rot); ohne Sorte weißer Ring. Sortenfilter (in der Übersicht): nicht passende Bäume 60 % durchsichtig, passende 10 % größer. Keine Text-Labels auf der Karte (bräuchten Glyph-Dateien aus dem Netz); die Nummer steht im Panel.
- **Bäume platzieren:** per GPS-Mittelung, per Tipp auf die Karte und per Drag-Korrektur (nur im expliziten Modus „Position verschieben“; danach `gps_genauigkeit_m = null`).
- **Offline-Karte:** Esri World Imagery, echte Luftbilder über dem Hain nur bis Zoom 18 (darüber vergrößert). Download für die Grundstücks-BBox + 100 m, Zoom 12–18, per Knopf; Workbox-CacheFirst mit eigenem Cache-Namen und Obergrenze.
- **Export/Import:** Der eigene GeoJSON-Export enthält IDs, Zeitstempel, den Saisonstatus aller Jahre (`properties.saison`) und die Sortenliste mit Farben im Mitglied `hrvst` der FeatureCollection (mit `format`-Version). Import stellt daraus alles wieder her; fremde GeoJSON-Dateien ohne diese Angaben bleiben importierbar. Ein Rundreise-Test sichert das ab.
- **GPS-Mittelung** (`src/logic/gpsMittel.ts`): Gewicht 1/Genauigkeit², Fixes über 30 m verworfen, Ausreißer > 3 × eigene Genauigkeit verworfen (nie die Mehrheit), mindestens 5 Fixes, Genauigkeit konservativ (höchstens ein unabhängiger Fix pro 5 s, nie besser als die Streuung). Die GPS-Höhe wird nicht gespeichert (Android liefert Ellipsoid-, iOS Meereshöhe).
- **Baum-Panel:** nicht modal (Karte bleibt bedienbar, anderer Baum antippen wechselt), jede Änderung wird sofort gespeichert. Baumpunkte sind klein (Zoom 18 ≈ 3 m), antippbar über eine Trefferfläche von ca. 44 px.
- **Einstellungen:** Füllstand-Maximum 2–10, GPS-Zielgenauigkeit 1–20 m (Schritt 0,5 m); Grenzen in `src/logic/einstellungen.ts`. Sprachwechsel wirkt sofort (`setzeSprache` im Sprachkontext).
- **Export-Bedienung:** erst Datei vorbereiten, dann „Teilen oder speichern“ im zweiten Tipp (iOS öffnet das Teilen-Menü nur direkt nach einer Nutzeraktion); „Herunterladen“ als Alternative.
- **Grenze per GPS:** „Eckpunkt an meinem Standort setzen“ nutzt dieselbe GPS-Mittelung wie „Baum hier eintragen“.
- **Ringfarben:** feste, benannte Palette in `src/logic/sorten.ts` ohne Grün/Rot/Grau (Statusfarben) und ohne Weiß (ohne Sorte).

## Technische Hinweise
- Browsertests laufen mit Headless Chrome über CDP-Skripte im Scratchpad (nicht im Repo), mit ausgedachten Koordinaten; GPS wird über `Emulation.setGeolocationOverride` simuliert.
- MapLibre 6: nur benannte Importe (`Map as MapLibreMap`, `Marker`, …); der Worker wird über `maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url` und `setWorkerUrl` eingebunden. `['zoom']` nur als Eingabe eines `interpolate` auf oberster Ebene.
- Nicht auf `loaded()`/`isStyleLoaded()` verlassen, sondern `KartenSteuerung.beiGeladen()` nutzen.
- Beim Start die gespeicherte Sprache mit Zeitlimit laden, damit ein hängendes IndexedDB die App nicht blockiert.
- Keine `\uXXXX`-Escapes in Quelltext schreiben (werden beim Schreiben zu echten Zeichen, ESLint `no-irregular-whitespace`); stattdessen z. B. `/\s/g`.
- Unter Windows kollidieren Dateinamen, die sich nur in der Groß-/Kleinschreibung unterscheiden (`Karte.tsx` vs. `karte.ts`).
