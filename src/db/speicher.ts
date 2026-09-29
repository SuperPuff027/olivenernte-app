export type SpeicherZustand = 'dauerhaft' | 'nicht_dauerhaft' | 'nicht_unterstuetzt';

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
