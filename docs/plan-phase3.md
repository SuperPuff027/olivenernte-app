# Plan Phase 3: Daten, Historie, Sync

**Laut `docs/phasen.md`:** Saisonwechsel (alte Saisons bleiben), Export/Import als CSV und GeoJSON, Auswertungen (Ertrag pro Baum, Sorte, Jahr; Füllstand gegen Ertrag), Sync zwischen mehreren Handys mit der Regel „neuester `aktualisiert_am` gewinnt pro Datensatz“.

**Stand 2026-09-30:** Plan freigegeben, Umsetzung läuft. Die Feldtests von Phase 1 und 2 stehen noch aus und laufen parallel; Befunde daraus haben Vorrang.

## Entscheidungen
- **Backend:** Cloudflare Worker + D1 (SQLite) mit eigener kleiner Sync-Schnittstelle. Begründung: kostenlos ohne Pausieren (Supabase pausiert kostenlose Projekte nach 7 Tagen ohne Nutzung – ungünstig für eine saisonale App), keine neue Client-Bibliothek (nur `fetch`), wenig eigener Code, Standort EU wählbar, später kann ein WLAN-Gateway (Phase 4) per HTTP einliefern.
- **Zugang:** ein geheimer Hain-Code (Einrichten auf dem ersten Handy, Beitreten per Link), keine Einzelkonten.
- **Offline-first:** Dexie bleibt die Quelle. Lokale Änderungen landen automatisch (Dexie-Hooks) in einer Warteschlange; beim Abgleich werden sie gesendet und alles seit der letzten Server-Revision geholt. Pro Datensatz gewinnt der neuere `aktualisiert_am`; die Server-Revision dient nur als Lesezeiger.
- **Saison:** wird ausdrücklich gesetzt statt Kalenderjahr (Ernte kann über den Jahreswechsel laufen); Wechsel manuell mit Vorschlag der App.
- **Gemeinsame Einstellungen (werden abgeglichen):** aktuelle Saison, `fuellstand_max`. **Pro Gerät (nicht abgeglichen):** Sprache, GPS-Zielgenauigkeit, gemerkter Filter.
- Neue Abhängigkeiten nur für den Server (`server/`), vor Schritt 9 zur Bestätigung.

## Schritte
Nach jedem Schritt: `npm run check`, Commit, Push; die GitHub Action baut und veröffentlicht.

- [x] **1. Gemeinsame Einstellungen (Datenmodell v2).** Tabelle `hain` mit einem Datensatz (aktuelle Saison, `fuellstand_max`), abgleichbar wie alle anderen (id, `aktualisiert_am`, `geloescht`). Dexie-Migration v1 → v2 übernimmt `fuellstand_max` aus den Geräte-Einstellungen; aktuelle Saison = laufendes Jahr. Tests inkl. Migration.
- [x] **2. Saisonwechsel.** Die App nutzt die aktuelle Saison statt des Kalenderjahrs. „Neue Saison beginnen“ mit Rückfrage; alle Bäume starten als „nicht bereit“, alte Saisons bleiben. Vorschlag zum Wechsel, wenn das Kalenderjahr voraus ist. Umsetzung: Vorschlag ab Mai (Ernte läuft bis Jan./Feb.), als Hinweis in der Übersicht; Wechsel und „Zurück zur Saison …“ in den Einstellungen.
- [x] **3. Vergangene Saisons ansehen.** Saisonwahl in der Übersicht; Karte, Zähler und Filter zeigen die gewählte Saison mit deutlichem Hinweis und „zurück zur aktuellen Saison“. Umsetzung: Im Baum-Panel lassen sich Werte der angezeigten Saison nachtragen (z. B. Erträge früherer Jahre); nach einem Neustart zeigt die App wieder die aktuelle Saison.
- [x] **4. Historie im Baum-Panel.** Alle Saisons des Baums: Status, Füllstand, Ertrag, Erntedatum.
- [x] **5. Auswertung** (`src/logic/auswertung.ts`): Ertrag pro Sorte und Jahr, stärkste/schwächste Bäume, Füllstand gegen Ertrag (mittlerer Ertrag je Füllstand-Stufe und Saison). Einfache CSS-Balken.
- [ ] **6. CSV-Export.** Bäume sowie Ernte-Historie (Zeile pro Baum und Saison); Semikolon, Dezimalkomma bei de/tr, UTF-8 mit BOM (Excel).
- [ ] **7. CSV-Import von Bäumen** (Nummer, Breite, Länge, Sorte, Notiz); Trenner und Dezimalzeichen automatisch; vorhandene Import-Vorschau.
- [ ] **8. Sync-Logik im Client.** Warteschlange per Dexie-Hooks, Zusammenführen „neuester gewinnt“, Protokoll mit Lesezeiger; Tests gegen einen simulierten Server.
- [ ] **9. Server** (`server/`): Cloudflare Worker + D1, Endpunkte „Hain anlegen“ und „Abgleich“, Deploy per GitHub Action. Braucht Cloudflare-Konto und API-Token (GitHub-Secret).
- [ ] **10. Sync-Oberfläche.** Einrichten/Beitreten (Code, Link), Status, „Jetzt abgleichen“, Offline-Hinweis; automatisch beim Start, bei Netz, nach Änderungen, minütlich.
- [ ] **11. Doppelte Baumnummern** nach dem Abgleich erkennen und anzeigen (Umbenennen von Hand im Panel).
- [ ] **12. Feldtest-Checkliste Phase 3** (`docs/feldtest-phase3.md`): zwei Handys, offline parallel, Abgleich, Konflikte, Saisonwechsel, CSV in Excel.
