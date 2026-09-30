# Feldtest Phase 2: Filter und Ernteworkflow

Ziel laut `docs/phasen.md`: **Während der Ernte werden gezielt die nächsten bereiten Bäume einer Sorte gefunden.**

Voraussetzung: Feldtest Phase 1 (`docs/feldtest-phase1.md`) ist gemacht oder läuft mit. App installiert, Karte offline gespeichert, im Hain sind mehrere Bäume mit Sorte eingetragen. Am besten während einer echten Ernte testen.

Erst Android (Chrome), vor Abschluss der Phase dasselbe auf dem iPhone (Safari, installierte App).

App: <https://superpuff027.github.io/olivenernte-app/>

Ergebnis je Zeile eintragen: ✅ ok · ❌ Fehler (unten unter „Befunde“ beschreiben) · – nicht getestet.

---

## A. Vorbereitung (mit oder ohne Netz)

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| A1 | Menü → „GeoJSON exportieren“ → Datei sichern | Sicherung vor dem Test | | |
| A1b | Mit Netz: Menü → „Karte offline speichern“ erneut ausführen (lädt jetzt auch die Ortsnamen) | „Fertig“ ohne Fehler; weit herausgezoomt sind Ortsnamen zu sehen, ab etwa Zoom 17 verschwinden sie | | |
| A2 | Bei 5–10 Bäumen im Panel Status und Füllstand setzen (einige „Bereit“, verschiedene Füllstände) | Farben auf der Karte stimmen | | |
| A3 | „Bäume: n“ antippen | Abschnitt „Ernte {Jahr}“ (noch 0 kg), „Nach Status“ und „Nach Sorte“ mit richtigen Zahlen | | |

## B. Filter (im Hain, ohne Netz)

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| B1 | Übersicht: eine Sorte antippen | Blatt schließt, andere Bäume blass, passende etwas größer; oben z. B. „Memecik (7)“ | | |
| B2 | Übersicht: zusätzlich „Bereit“ antippen | Anzeige „Memecik · Bereit (n)“, Zahl stimmt mit den Punkten | | |
| B3 | Übersicht: „Füllstand eingrenzen“, mit −/+ z. B. 3–5 einstellen | Blatt bleibt offen; Anzeige „… · Füllstand 3–5 (n)“; Bäume ohne Füllstand sind blass | | |
| B4 | App komplett schließen und neu öffnen | Filter ist noch aktiv | | |
| B5 | ✕ in der Filteranzeige | Alle Bäume wieder normal | | |
| B6 | Sind die blassen und die hervorgehobenen Bäume in der Sonne gut zu unterscheiden? | Notiz: ______ | | |

## C. Ernte-Durchgang (im Hain, ohne Netz, GPS an)

Filter setzen: eure Sorte + „Bereit“.

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| C1 | „Nächste“ antippen | Nach wenigen Sekunden Liste der nächsten passenden Bäume mit Metern und Richtung; Standortgenauigkeit oben | | |
| C2 | Stimmen Entfernung und Richtung ungefähr mit der Wirklichkeit? | Notiz (z. B. „B-7: 40 m NO, tatsächlich ~35 m“): ______ | | |
| C3 | Ersten Eintrag antippen | Karte springt zum Baum, Panel öffnet sich | | |
| C4 | Im Panel „Geerntet“ | Kasten mit Mengenfeld und Erntedatum (heute); auf Android öffnet sich die Zifferntastatur | | |
| C5 | Menge mit Komma eingeben (z. B. „23,5“), „Geerntet speichern“ | „Ertrag: 23,5 kg · geerntet am …“, Punkt wird grau | | |
| C6 | „Nächster passender Baum →“ | Springt zum nächsten passenden Baum; Panel öffnet sich | | |
| C7 | C4–C6 für 3–5 Bäume wiederholen, einmal „Ohne Menge“ benutzen | Jeder Baum wird grau, der Durchgang läuft flüssig | | |
| C8 | Bei einem geernteten Baum „Ertrag oder Datum ändern“, Menge korrigieren | Neue Menge gespeichert, Datum bleibt | | |
| C9 | Falsche Eingaben: leer, „abc“, „600“ | Verständliche Meldung, nichts gespeichert | | |
| C10 | Letzten passenden Baum ernten, dann „Nächster passender Baum →“ | Hinweis „Kein weiterer passender Baum.“ | | |
| C11 | Bedienung mit Handschuhen und schmutzigen Fingern | Knöpfe und Zahlenfeld treffbar | | |

## D. Auswertung und Sicherung

| # | Schritt | Erwartet | Android | iPhone |
|---|---|---|---|---|
| D1 | „Bäume: n“ antippen | „Ertrag gesamt“ = Summe der eingegebenen Mengen; „Geerntet: n von m“; „davon 1 ohne Mengenangabe“; Ertrag bei der Sorte | | |
| D2 | App schließen, Handy neu starten, App öffnen | Ernte, Mengen und Filter sind noch da | | |
| D3 | Mit Netz: Menü → „GeoJSON exportieren“ → Datei sichern | Export enthält die Ernte (optional in geojson.io prüfen: `saison` mit `ertrag_kg`) | | |

---

## Befunde

| Gerät | Schritt | Beobachtung | Screenshot |
|---|---|---|---|
| | | | |

## Ergebnis

- [ ] Android: Phase-2-Ziel erreicht (C1–C7 ohne Netz ✅)
- [ ] iPhone: Phase-2-Ziel erreicht (C1–C7 ohne Netz ✅)
- [ ] Neue türkische Texte (Ernte, Filter, Nächste, Himmelsrichtungen K/KD/D/…) von Muttersprachlern gegengelesen
