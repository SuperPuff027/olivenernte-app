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
} as const;

export type Schluessel = keyof typeof de;
export type Uebersetzung = Readonly<Record<Schluessel, string>>;
