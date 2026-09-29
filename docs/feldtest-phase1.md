# Feldtest Phase 1

Ziel laut `docs/phasen.md`: **Im Hain ohne Netz auf Android und iPhone Bäume eintragen, Eigenschaften setzen, Farben sehen, und die Daten überleben einen App-Neustart.**

Reihenfolge: zuerst Android (Chrome), vor Abschluss der Phase dasselbe auf dem iPhone (Safari).

App: <https://superpuff027.github.io/olivenernte-app/>

In jeder Tabelle das Ergebnis eintragen: ✅ ok · ❌ Fehler (unten unter „Befunde“ beschreiben) · – nicht getestet.

---

## A. Zu Hause vorbereiten (mit WLAN)

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| A1 | App-Adresse im Browser öffnen (Android: Chrome, iPhone: **Safari**) | Luftbild erscheint, unten „Menü“, „+“, „Mein Standort“ | | |
| A2 | Installieren. Android: Chrome-Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“. iPhone: Teilen-Symbol → „Zum Home-Bildschirm“ | Icon „HRVST“ auf dem Startbildschirm | | |
| A3 | Browser schließen, App **nur noch über das Icon** öffnen | Öffnet ohne Adressleiste (Vollbild) | | |
| A4 | Menü → Einstellungen → Abschnitt „Datenspeicher“ | „Dauerhaft …“ und „Als App installiert“. Sonst „Dauerhaften Speicher erneut anfragen“ tippen und das Ergebnis notieren | | |
| A5 | Grundstück vorhanden? Sonst Menü → „GeoJSON importieren“ (z. B. `hain.geojson`) oder „Grundstück zeichnen“ | Gelbe Grenze sichtbar | | |
| A6 | Menü → „Karte offline speichern“ → „Herunterladen“, bis „vollständig“ erscheint | Fortschritt läuft durch, keine Fehlermeldung. Anzahl Kacheln und MB notieren: ______ | | |
| A7 | Menü → Einstellungen: Sprache auf Türkçe, dann wieder zurück | Oberfläche wechselt sofort | | |
| A8 | Menü → Sorten: die im Hain vorkommenden Sorten anlegen und Farben wählen | Sorten erscheinen in der Liste | | |
| A9 | Menü → „GeoJSON exportieren“ → „Teilen oder speichern“ → an sich selbst senden oder in „Dateien“/Drive speichern | Datei `hrvst-JJJJ-MM-TT.geojson` kommt an (Sicherung vor dem Feldtest) | | |

## B. Offline-Probe (noch zu Hause)

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| B1 | **Flugmodus an** (WLAN und Mobilfunk aus) | – | | |
| B2 | App komplett schließen (aus dem App-Umschalter wischen) und über das Icon neu öffnen | App startet, Luftbild des Hains und Grenze sind da | | |
| B3 | Auf verschiedene Zoomstufen über dem Grundstück zoomen | Bis Zoom 18 scharfe Luftbilder, darüber vergrößert. Außerhalb des gespeicherten Bereichs dürfen Flächen fehlen | | |
| B4 | Flugmodus wieder aus | – | | |

## C. Im Hain (ohne Netz)

Vor Ort den Flugmodus einschalten **oder** mobile Daten ausschalten. **GPS/Standort muss an bleiben.**

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| C1 | App öffnen, „Mein Standort“ | Blauer Punkt mit Genauigkeitskreis an der richtigen Stelle; Freigabe-Abfrage erlauben | | |
| C2 | Am Stamm eines Baums: „+“ → „Hier per GPS“ | Genauigkeit sinkt, „Ziel erreicht“ nach ca. ___ s (notieren), blauer Messpunkt am Baum | | |
| C3 | „Übernehmen“ | Hinweis „B-n eingetragen (± x m)“, Panel öffnet sich | | |
| C4 | Im Panel: Status, Füllstand, Sorte setzen, Notiz schreiben | Punkt ändert sofort Farbe (Innen = Status, Ring = Sorte) | | |
| C5 | Im Panel „+ Neue Sorte …“: Name eintippen, Farbe wählen, „Anlegen“ | Baum bekommt die neue Sorte, Ring in der gewählten Farbe | | |
| C6 | Liegt der Punkt sichtbar neben der Krone? Im Panel „Position verschieben“, Punkt auf die Krone ziehen, „Speichern“ | „Position gespeichert“, GPS-Genauigkeit „unbekannt“ | | |
| C7 | Nächster Baum per „+“ → „Per Tipp auf die Karte“: 3–5 Bäume antippen, einen per „Rückgängig“ entfernen, „Fertig“ | Nummern fortlaufend, entfernter Baum verschwindet | | |
| C8 | Bekannten Baum antippen, Nummer ändern (z. B. auf eine schon vergebene) | Hinweis „schon vergeben“, nichts gespeichert. Mit freier Nummer wird gespeichert | | |
| C9 | „Bäume: n“ antippen | Zahlen pro Sorte stimmen mit dem Eingetragenen | | |
| C10 | In der Übersicht eine Sorte antippen (Filter) | Andere Bäume blass, gewählte Sorte etwas größer; ✕ oben hebt den Filter auf | | |
| C11 | Menü → Grundstück bearbeiten → an eine Ecke stellen → „Eckpunkt hier setzen (GPS)“ → „Übernehmen“. Danach „Abbrechen“ (falls die Grenze nicht geändert werden soll) oder „Speichern“ | Punkt erscheint an der Standortposition | | |
| C12 | Genauigkeit notieren: Wie weit liegen GPS-Punkte neben den Kronen im Luftbild? | Notiz: ______ | | |
| C13 | Bedienung mit Handschuhen und in praller Sonne | Knöpfe treffbar, Texte und Farben lesbar | | |

## D. Neustart und Sicherung

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| D1 | App komplett schließen (aus dem App-Umschalter wischen), Handy sperren, nach einigen Minuten neu öffnen | Alle Bäume, Farben, Sorten, Notizen und die Grenze sind noch da | | |
| D2 | Handy neu starten, App öffnen (weiter ohne Netz) | Wie D1 | | |
| D3 | Wieder mit Netz: Menü → „GeoJSON exportieren“ → Datei sichern | Datei enthält die neuen Bäume (Anzahl im Export-Blatt prüfen) | | |
| D4 | Optional: Datei auf <https://geojson.io> öffnen | Grenze und Bäume an den richtigen Stellen | | |

---

## Befunde

Für jeden Fehler: Gerät (Modell, Android-/iOS-Version), Schritt-Nr., was passiert ist und was erwartet war. Screenshot, falls möglich.

| Gerät | Schritt | Beobachtung | Screenshot |
|---|---|---|---|
| | | | |

## Ergebnis

- [ ] Android: Phase-1-Ziel erreicht (C2–C4 und D1–D2 ohne Netz ✅)
- [ ] iPhone: Phase-1-Ziel erreicht (C2–C4 und D1–D2 ohne Netz ✅)
- [ ] Türkische Übersetzung von Muttersprachlern gegengelesen (die Texte in `src/i18n/tr.ts` sind als ungeprüft markiert)
