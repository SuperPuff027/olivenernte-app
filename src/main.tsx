import { render } from 'preact';
import { App } from './App';
import { ladeEinstellungen } from './db/repo';
import { fordereDauerhaftenSpeicher } from './db/speicher';
import { SprachAnbieter } from './i18n/kontext';
import { ermittleSprache } from './logic/sprache';

async function start() {
  void fordereDauerhaftenSpeicher(navigator.storage);

  let gespeicherteSprache: string | null = null;
  try {
    gespeicherteSprache = (await ladeEinstellungen()).sprache;
  } catch (fehler) {
    // Ohne IndexedDB (z. B. privater Modus) trotzdem starten.
    console.error('Einstellungen konnten nicht geladen werden', fehler);
  }
  const sprache = ermittleSprache(gespeicherteSprache, navigator.languages);

  render(
    <SprachAnbieter sprache={sprache}>
      <App />
    </SprachAnbieter>,
    document.getElementById('app')!,
  );
}

void start();
