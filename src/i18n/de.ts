// Quellsprache. Die Schlüssel dieser Datei definieren den Schlüssel-Typ für alle Sprachen.
export const de = {
  'app.titel': 'Olivenernte',

  'allgemein.speichern': 'Speichern',
  'allgemein.abbrechen': 'Abbrechen',
  'allgemein.loeschen': 'Löschen',
  'allgemein.ok': 'OK',
  'allgemein.schliessen': 'Schließen',

  'status.nicht_bereit': 'Nicht bereit',
  'status.bereit': 'Bereit',
  'status.geerntet': 'Geerntet',

  'standort.zeigen': 'Mein Standort',
  'standort.fehler.verweigert': 'Standortzugriff verweigert. Bitte in den Einstellungen des Telefons erlauben.',
  'standort.fehler.nicht_verfuegbar': 'Standort nicht verfügbar. Ist GPS eingeschaltet?',
  'standort.fehler.zeitueberschreitung': 'Kein GPS-Signal. Bitte unter freiem Himmel erneut versuchen.',

  'menue.oeffnen': 'Menü',

  'import.knopf': 'GeoJSON importieren',
  'import.titel': 'Import prüfen',
  'import.grundstueck_neu': 'Neues Grundstück: {name}',
  'import.grundstueck_ersetzt': 'Grundstücksgrenze wird ersetzt: {name}',
  'import.baeume': 'Neue Bäume: {n}',
  'import.sorten': 'Neue Sorten: {n}',
  'import.uebersprungen': 'Übersprungen: {n}',
  'import.eintrag': 'Eintrag {nr}',
  'import.grund.unbekannter_typ': 'unbekannter Typ',
  'import.grund.ungueltige_geometrie': 'ungültige Koordinaten',
  'import.grund.ohne_nummer': 'ohne Baumnummer',
  'import.grund.nummer_doppelt': 'Nummer doppelt in der Datei',
  'import.grund.nummer_vorhanden': 'Nummer gibt es schon',
  'import.grund.weiteres_grundstueck': 'nur ein Grundstück wird übernommen',
  'import.nichts_neu': 'Nichts Neues zu importieren.',
  'import.ausfuehren': 'Importieren',
  'import.fertig': 'Import abgeschlossen.',
  'import.fehler.kein_geojson': 'Die Datei ist kein gültiges GeoJSON.',
  'import.fehler.leer': 'Die Datei enthält weder ein Grundstück noch Bäume.',
  'import.fehler.lesen': 'Die Datei konnte nicht gelesen werden.',
  'import.fehler.speichern': 'Import fehlgeschlagen. Es wurde nichts gespeichert.',
} as const;

export type Schluessel = keyof typeof de;
export type Uebersetzung = Readonly<Record<Schluessel, string>>;
