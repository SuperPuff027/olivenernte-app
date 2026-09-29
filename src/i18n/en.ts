// UNGEPRÜFT – von Claude Code erstellt, noch nicht gegengelesen.
import type { Uebersetzung } from './de';

export const en: Uebersetzung = {
  'app.titel': 'Olive Harvest',

  'allgemein.speichern': 'Save',
  'allgemein.abbrechen': 'Cancel',
  'allgemein.loeschen': 'Delete',
  'allgemein.ok': 'OK',
  'allgemein.schliessen': 'Close',

  'status.nicht_bereit': 'Not ready',
  'status.bereit': 'Ready',
  'status.geerntet': 'Harvested',

  'standort.zeigen': 'My location',
  'standort.fehler.verweigert': 'Location access denied. Please allow it in the phone settings.',
  'standort.fehler.nicht_verfuegbar': 'Location unavailable. Is GPS turned on?',
  'standort.fehler.zeitueberschreitung': 'No GPS signal. Please try again under open sky.',

  'menue.oeffnen': 'Menu',

  'import.knopf': 'Import GeoJSON',
  'import.titel': 'Review import',
  'import.grundstueck_neu': 'New plot: {name}',
  'import.grundstueck_ersetzt': 'Plot boundary will be replaced: {name}',
  'import.baeume': 'New trees: {n}',
  'import.sorten': 'New varieties: {n}',
  'import.uebersprungen': 'Skipped: {n}',
  'import.eintrag': 'Entry {nr}',
  'import.grund.unbekannter_typ': 'unknown type',
  'import.grund.ungueltige_geometrie': 'invalid coordinates',
  'import.grund.ohne_nummer': 'no tree number',
  'import.grund.nummer_doppelt': 'number appears twice in the file',
  'import.grund.nummer_vorhanden': 'number already exists',
  'import.grund.weiteres_grundstueck': 'only one plot is imported',
  'import.nichts_neu': 'Nothing new to import.',
  'import.ausfuehren': 'Import',
  'import.fertig': 'Import complete.',
  'import.fehler.kein_geojson': 'The file is not valid GeoJSON.',
  'import.fehler.leer': 'The file contains neither a plot nor trees.',
  'import.fehler.lesen': 'The file could not be read.',
  'import.fehler.speichern': 'Import failed. Nothing was saved.',

  'grundstueck.zeichnen': 'Draw plot',
  'grundstueck.bearbeiten': 'Edit plot',
  'grundstueck.standard_name': 'Plot',
  'grundstueck.anleitung': 'Tap map: add point. Drag point: move. Tap point: select.',
  'grundstueck.punkte': 'Points: {n}',
  'grundstueck.rueckgaengig': 'Undo',
  'grundstueck.punkt_loeschen': 'Delete point',
  'grundstueck.verwerfen_frage': 'Discard changes to the boundary?',
  'grundstueck.gespeichert': 'Plot saved.',
  'grundstueck.fehler.zu_wenige_punkte': 'at least 3 points needed',
  'grundstueck.fehler.ueberschneidung': 'boundary crosses itself',
  'grundstueck.fehler.speichern': 'Saving failed.',
};
