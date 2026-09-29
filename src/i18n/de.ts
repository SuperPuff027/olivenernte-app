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
} as const;

export type Schluessel = keyof typeof de;
export type Uebersetzung = Readonly<Record<Schluessel, string>>;
