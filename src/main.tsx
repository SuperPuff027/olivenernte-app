import { render } from 'preact';
import { App } from './App';
import { SprachAnbieter } from './i18n/kontext';
import { ermittleSprache } from './logic/sprache';

// Gespeicherte Sprachwahl folgt mit den Einstellungen (Dexie).
const sprache = ermittleSprache(null, navigator.languages);

render(
  <SprachAnbieter sprache={sprache}>
    <App />
  </SprachAnbieter>,
  document.getElementById('app')!,
);
