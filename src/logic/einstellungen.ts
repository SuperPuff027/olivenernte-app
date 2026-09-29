// Grenzen und Schrittweiten der Einstellungen sowie der Hinweis zum dauerhaften Speicher.

export interface Bereich {
  min: number;
  max: number;
  schritt: number;
}

/** Füllstand-Knöpfe 1 … max im Baum-Panel */
export const FUELLSTAND_MAX_BEREICH: Bereich = { min: 2, max: 10, schritt: 1 };
/** Zielgenauigkeit der GPS-Mittelung in m */
export const ZIEL_GENAUIGKEIT_BEREICH: Bereich = { min: 1, max: 20, schritt: 0.5 };

/** Rundet auf die Schrittweite und begrenzt auf den Bereich; ungültige Werte ergeben das Minimum. */
export function begrenze(wert: number, bereich: Bereich): number {
  if (!Number.isFinite(wert)) return bereich.min;
  const gerundet = Math.round(wert / bereich.schritt) * bereich.schritt;
  // Rundungsfehler bei Kommaschritten (z. B. 0,1 + 0,2) abschneiden
  const sauber = Number(gerundet.toFixed(6));
  return Math.min(bereich.max, Math.max(bereich.min, sauber));
}

/** Einen Schritt nach oben (richtung = 1) oder unten (-1), innerhalb des Bereichs. */
export function schritt(wert: number, richtung: 1 | -1, bereich: Bereich): number {
  return begrenze(begrenze(wert, bereich) + richtung * bereich.schritt, bereich);
}

export type SpeicherZustand = 'dauerhaft' | 'nicht_dauerhaft' | 'nicht_unterstuetzt';

/**
 * Was der Nutzer tun kann, damit die Daten sicher erhalten bleiben:
 * - keiner: alles in Ordnung (oder nichts zu tun)
 * - ios_home: iPhone/iPad ohne Installation: über Safari „Zum Home-Bildschirm“, nur dort bleibt der Speicher
 * - installieren: andere Geräte ohne Installation: App installieren, dann erneut anfragen
 * - erneut: installiert, aber (noch) nicht dauerhaft: erneut anfragen
 */
export type SpeicherHinweis = 'keiner' | 'ios_home' | 'installieren' | 'erneut';

export function speicherHinweis(
  zustand: SpeicherZustand,
  geraet: { ios: boolean; installiert: boolean },
): SpeicherHinweis {
  if (zustand === 'dauerhaft') return 'keiner';
  if (geraet.ios && !geraet.installiert) return 'ios_home';
  if (zustand === 'nicht_unterstuetzt') return 'keiner';
  return geraet.installiert ? 'erneut' : 'installieren';
}

/** iPhone, iPod oder iPad (iPadOS meldet sich als Mac, hat aber einen Touchscreen). */
export function istIos(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}
