import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Schluessel } from './i18n';
import { useSprache } from './i18n/kontext';
import { Karte } from './karte/Karte';
import type { KartenSteuerung } from './karte/kartenSteuerung';

const HINWEIS_DAUER_MS = 6000;

// Fehlercodes der Geolocation-API
const ZUGRIFF_VERWEIGERT = 1;
const ZEITUEBERSCHREITUNG = 3;

function standortFehlerText(code: number): Schluessel {
  switch (code) {
    case ZUGRIFF_VERWEIGERT:
      return 'standort.fehler.verweigert';
    case ZEITUEBERSCHREITUNG:
      return 'standort.fehler.zeitueberschreitung';
    default:
      return 'standort.fehler.nicht_verfuegbar';
  }
}

export function App() {
  const { t } = useSprache();
  const steuerung = useRef<KartenSteuerung | null>(null);
  const [hinweis, setHinweis] = useState<Schluessel | null>(null);

  useEffect(() => {
    if (!hinweis) return;
    const zeitgeber = setTimeout(() => setHinweis(null), HINWEIS_DAUER_MS);
    return () => clearTimeout(zeitgeber);
  }, [hinweis]);

  const beiBereit = useCallback((s: KartenSteuerung) => (steuerung.current = s), []);
  const beiStandortFehler = useCallback(
    (code: number) => setHinweis(standortFehlerText(code)),
    [],
  );

  return (
    <main class="app">
      <Karte beiBereit={beiBereit} beiStandortFehler={beiStandortFehler} />

      {hinweis && (
        <div class="hinweis" role="alert" onClick={() => setHinweis(null)}>
          {t(hinweis)}
        </div>
      )}

      <nav class="leiste">
        <button
          type="button"
          class="knopf"
          onClick={() => steuerung.current?.zeigeStandort()}
          aria-label={t('standort.zeigen')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="2" />
          </svg>
          <span>{t('standort.zeigen')}</span>
        </button>
      </nav>
    </main>
  );
}
