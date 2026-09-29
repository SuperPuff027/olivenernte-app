import type { ComponentChildren } from 'preact';
import { useSprache } from '../i18n/kontext';

interface Props {
  titel: string;
  beiSchliessen: () => void;
  children: ComponentChildren;
  /** Große Knöpfe am unteren Rand */
  aktionen?: ComponentChildren;
}

/** Von unten eingeblendetes Blatt über der Karte; Tipp auf den Hintergrund schließt. */
export function Blatt({ titel, beiSchliessen, children, aktionen }: Props) {
  const { t } = useSprache();
  return (
    <div class="blatt-hintergrund" onClick={beiSchliessen}>
      <section
        class="blatt"
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        onClick={(e) => e.stopPropagation()}
      >
        <header class="blatt-kopf">
          <h2>{titel}</h2>
          <button type="button" class="knopf knopf-schliessen" onClick={beiSchliessen} aria-label={t('allgemein.schliessen')}>
            <svg viewBox="0 0 24 24" aria-hidden="true" class="knopf-symbol">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
          </button>
        </header>
        <div class="blatt-inhalt">{children}</div>
        {aktionen && <footer class="blatt-aktionen">{aktionen}</footer>}
      </section>
    </div>
  );
}
