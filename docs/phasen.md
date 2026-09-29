# Phasen

## Phase 1: Kern-Karte (MVP)
- Karte mit Satellitenlayer und begrenztem Offline-Cache
- Grundstücksgrenze als Polygon zeichnen, bearbeiten, speichern
- Bäume per gemittelter GPS-Position oder Tipp auf die Karte eintragen; Position per Drag korrigierbar
- Sortenverwaltung in der App: beliebig viele Sorten anlegen, umbenennen, löschen; Ringfarbe pro Sorte per Farbwähler. Keine Sorten fest im Code. Löschen einer Sorte, die noch Bäumen zugeordnet ist, nur mit Rückfrage (Bäume umhängen oder Sorte behalten).
- Tipp auf einen Punkt öffnet Panel: Nummer, Sorte, Status, Füllstand (1–5), Koordinaten, GPS-Genauigkeit, Notiz
- Farbdarstellung laut CLAUDE.md, Speicherung in IndexedDB (Dexie)
- Einfacher Export als GeoJSON (Datensicherung, da iOS-Speicher nicht garantiert ist)
- Erster Feldtest auf Android (Chrome). iOS-Kompatibilität trotzdem von Anfang an einhalten, Test auf iPhone vor Abschluss der Phase.
- **Fertig, wenn:** im Hain ohne Netz auf Android und iPhone Bäume eingetragen, Eigenschaften gesetzt und Farben gesehen werden können und die Daten einen App-Neustart überleben.

## Phase 2: Filter und Ernteworkflow
- Filter nach Sorte, kombinierbar mit Status und Füllstand-Bereich
- Schnellaktion „Geerntet“ mit Ertrag in kg
- Übersicht: Anzahl Bäume pro Status und Sorte, Gesamtertrag der Saison
- **Fertig, wenn:** während der Ernte gezielt die nächsten bereiten Bäume einer Sorte gefunden werden.

## Phase 3: Daten, Historie, Sync
- Saisonwechsel: neuer SaisonStatus pro Baum, alte Saisons bleiben
- Export/Import (CSV, GeoJSON)
- Auswertungen: Ertrag pro Baum, Sorte, Jahr; geschätzter Füllstand gegen tatsächlichen Ertrag
- Sync zwischen mehreren Handys (mehrere Personen erfassen im Feld). Konfliktregel: neuester `aktualisiert_am` gewinnt pro Datensatz. Backend-Wahl im Plan dieser Phase begründen.
- Erfassung früh starten, weil die Prognose mehrere Erntejahre braucht.

## Phase 4: Bewässerung (Meshtastic)
- Bodenfeuchtesensoren an Meshtastic-Knoten (ESP32/LoRa), Kalibrierung gegen bekannte Feuchtewerte
- Datenweg: iOS kann kein Web-Bluetooth. Daher entweder
  a) Android-Gerät liest Knoten per Web-Bluetooth aus und verteilt die Werte per Sync, oder
  b) Gateway-Knoten mit WLAN leitet Telemetrie an das Backend (MQTT) weiter.
  Entscheidung im Plan dieser Phase.
- Sensoren als Punkte mit aktuellem Wert und Verlauf
- Interpolation zwischen Sensoren: Start mit Inverse Distance Weighting, später Kriging. Anzeige als blauer Verlauf im Filter „Bewässerung“, nur innerhalb des Grundstücks.
- Grenzen anzeigen: Die Karte zeigt geschätzte Feuchte zwischen Sensoren, nicht den Wasserfluss. Außerhalb der Sensorabdeckung (Extrapolation) Unsicherheit deutlich markieren.

## Phase 5: 3D-Terrain
- Höhenmodell (DEM) als MapLibre-Terrain, Baumpunkte in 3D
- Abflussrichtung aus Gefälle ableiten und mit Feuchtedaten vergleichen

## Phase 6: Ertragsprognose
- Prädiktoren: Sorte, Füllstand-Schätzung, Vorjahresertrag pro Baum (Alternanz: starke und schwache Jahre wechseln sich ab), Feuchte
- Start einfach: Mittelwert pro Sorte, dann lineare Regression; Streuung bzw. Intervall immer mit anzeigen
- Komplexere Modelle erst bei mehreren Erntejahren
