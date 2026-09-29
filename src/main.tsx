import { render } from 'preact';
import { App } from './App';
import { ladeEinstellungen } from './db/repo';
import { fordereDauerhaftenSpeicher } from './db/speicher';
import { SprachAnbieter } from './i18n/kontext';
import { ermittleSprache } from './logic/sprache';
import './stil.css';

// Manche Browser (u. a. ältere iOS-Versionen) lassen das Öffnen von IndexedDB hängen.
const EINSTELLUNGEN_ZEITLIMIT_MS = 2000;

async function ladeGespeicherteSprache(): Promise<string | null> {
  const zeitlimit = new Promise<null>((aufloesen) =>
    setTimeout(() => aufloesen(null), EINSTELLUNGEN_ZEITLIMIT_MS),
  );
  try {
    return await Promise.race([ladeEinstellungen().then((e) => e.sprache), zeitlimit]);
  } catch (fehler) {
    // Ohne IndexedDB (z. B. privater Modus) trotzdem starten.
    console.error('Einstellungen konnten nicht geladen werden', fehler);
    return null;
  }
}

async function start() {
  void fordereDauerhaftenSpeicher(navigator.storage);

  const gespeicherteSprache = await ladeGespeicherteSprache();
  const sprache = ermittleSprache(gespeicherteSprache, navigator.languages);

  render(
    <SprachAnbieter sprache={sprache}>
      <App />
    </SprachAnbieter>,
    document.getElementById('app')!,
  );
}

void start();
