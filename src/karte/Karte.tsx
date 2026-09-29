import { useEffect, useRef } from 'preact/hooks';
import { erstelleKarte, type KartenSteuerung } from './kartenSteuerung';

interface Props {
  beiBereit: (steuerung: KartenSteuerung) => void;
  beiStandortFehler: (code: number) => void;
}

export function Karte({ beiBereit, beiStandortFehler }: Props) {
  const container = useRef<HTMLDivElement>(null);
  // Rückrufe in Refs, damit die Karte nicht bei jedem Rendern neu entsteht.
  const rueckrufe = useRef({ beiBereit, beiStandortFehler });
  rueckrufe.current = { beiBereit, beiStandortFehler };

  useEffect(() => {
    if (!container.current) return;
    const steuerung = erstelleKarte(container.current, (code) => rueckrufe.current.beiStandortFehler(code));
    rueckrufe.current.beiBereit(steuerung);
    return () => steuerung.entferne();
  }, []);

  return <div ref={container} class="karte" />;
}
