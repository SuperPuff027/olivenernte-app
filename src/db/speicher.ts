import type { SpeicherZustand } from '../logic/einstellungen';

export type { SpeicherZustand };

type Speicher = Pick<StorageManager, 'persist' | 'persisted'>;

/**
 * Bittet den Browser, die Daten nicht automatisch zu löschen.
 * iOS gewährt das in der Regel nur für die installierte App (Home-Bildschirm).
 */
export async function fordereDauerhaftenSpeicher(
  speicher: Speicher | undefined,
): Promise<SpeicherZustand> {
  if (!speicher?.persist || !speicher.persisted) return 'nicht_unterstuetzt';
  try {
    if (await speicher.persisted()) return 'dauerhaft';
    return (await speicher.persist()) ? 'dauerhaft' : 'nicht_dauerhaft';
  } catch {
    return 'nicht_dauerhaft';
  }
}

/** Nur abfragen, ohne erneut zu bitten (für die Anzeige in den Einstellungen). */
export async function pruefeSpeicher(speicher: Pick<StorageManager, 'persisted'> | undefined): Promise<SpeicherZustand> {
  if (!speicher?.persisted) return 'nicht_unterstuetzt';
  try {
    return (await speicher.persisted()) ? 'dauerhaft' : 'nicht_dauerhaft';
  } catch {
    return 'nicht_dauerhaft';
  }
}

/** Belegter Speicher der App in Byte, falls der Browser es verrät. */
export async function belegterSpeicher(speicher: Pick<StorageManager, 'estimate'> | undefined): Promise<number | null> {
  if (!speicher?.estimate) return null;
  try {
    return (await speicher.estimate()).usage ?? null;
  } catch {
    return null;
  }
}
