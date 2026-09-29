export const SPRACHEN = ['de', 'en', 'tr'] as const;
export type Sprache = (typeof SPRACHEN)[number];
export const STANDARD_SPRACHE: Sprache = 'de';

export function istSprache(wert: unknown): wert is Sprache {
  return typeof wert === 'string' && (SPRACHEN as readonly string[]).includes(wert);
}

/**
 * Gespeicherte Wahl hat Vorrang, sonst die erste unterstützte Gerätesprache
 * (z. B. "tr-TR" → "tr"), sonst Deutsch.
 */
export function ermittleSprache(
  gespeichert: string | null | undefined,
  geraeteSprachen: readonly string[],
): Sprache {
  if (istSprache(gespeichert)) return gespeichert;
  for (const tag of geraeteSprachen) {
    const basis = tag.split('-')[0]?.toLowerCase();
    if (istSprache(basis)) return basis;
  }
  return STANDARD_SPRACHE;
}
