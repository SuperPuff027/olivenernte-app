// Mittelung mehrerer GPS-Fixes für „Baum hier eintragen“.

export interface GpsFix {
  lat: number;
  lon: number;
  /** Vom Gerät gemeldete Genauigkeit (Radius in m) */
  genauigkeit_m: number;
  /** Zeitstempel des Fixes in ms */
  zeit_ms: number;
}

export interface GpsMittel {
  /** null, solange kein brauchbarer Fix vorliegt */
  punkt: { lat: number; lon: number } | null;
  /** Geschätzte Genauigkeit des Mittelwerts in m (konservativ) */
  genauigkeit_m: number | null;
  verwendet: number;
  verworfen: number;
}

/** Mindestzahl verwendeter Fixes, bevor das Ziel als erreicht gilt */
export const MIN_FIXES = 5;
/** Ungenauere Fixes (z. B. Ortung über WLAN/Mobilfunk beim Start) werden nicht verwendet */
export const MAX_FIX_GENAUIGKEIT_M = 30;
/** Ausreißer: weiter vom Mittel entfernt als dieses Vielfache der eigenen Genauigkeit */
const AUSREISSER_FAKTOR = 3;
/**
 * Aufeinanderfolgende Fixes sind stark korreliert (das Gerät glättet selbst). Als unabhängig
 * zählt höchstens ein Fix pro diesem Zeitraum, sonst wäre die Genauigkeit viel zu optimistisch.
 */
const KORRELATIONSZEIT_S = 5;
const ERDRADIUS_M = 6_371_000;

/** Abstand in m (lokale Näherung, für Entfernungen bis einige km genau genug). */
export function abstandM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dx = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad) * ERDRADIUS_M;
  const dy = (b.lat - a.lat) * rad * ERDRADIUS_M;
  return Math.hypot(dx, dy);
}

function gewicht(f: GpsFix): number {
  return 1 / (f.genauigkeit_m * f.genauigkeit_m);
}

function gewichtetesMittel(fixes: readonly GpsFix[]): { lat: number; lon: number } {
  let summe = 0;
  let lat = 0;
  let lon = 0;
  for (const f of fixes) {
    const w = gewicht(f);
    summe += w;
    lat += w * f.lat;
    lon += w * f.lon;
  }
  return { lat: lat / summe, lon: lon / summe };
}

function istBrauchbar(f: GpsFix): boolean {
  return (
    Number.isFinite(f.lat) &&
    Number.isFinite(f.lon) &&
    Math.abs(f.lat) <= 90 &&
    Math.abs(f.lon) <= 180 &&
    Number.isFinite(f.genauigkeit_m) &&
    f.genauigkeit_m > 0 &&
    f.genauigkeit_m <= MAX_FIX_GENAUIGKEIT_M
  );
}

/**
 * Gewichtetes Mittel (Gewicht 1/Genauigkeit²) ohne zu ungenaue Fixes und Ausreißer.
 * Genauigkeit = Maximum aus
 *  - Fehler des Mittelwerts, korrigiert um die Korrelation aufeinanderfolgender Fixes, und
 *  - Streuung der verwendeten Fixes um den Mittelwert.
 */
export function mittele(fixes: readonly GpsFix[]): GpsMittel {
  // Manche Geräte melden denselben Fix mehrfach; er zählt nur einmal.
  const gesehen = new Set<string>();
  const eindeutig = fixes.filter((f) => {
    const schluessel = `${f.zeit_ms}|${f.lat}|${f.lon}`;
    if (gesehen.has(schluessel)) return false;
    gesehen.add(schluessel);
    return true;
  });
  const brauchbar = eindeutig.filter(istBrauchbar);
  if (brauchbar.length === 0) return { punkt: null, genauigkeit_m: null, verwendet: 0, verworfen: eindeutig.length };

  const vorlaeufig = gewichtetesMittel(brauchbar);
  let verwendet = brauchbar.filter((f) => abstandM(f, vorlaeufig) <= AUSREISSER_FAKTOR * f.genauigkeit_m);
  // Nie die Mehrheit verwerfen: dann ist eher das vorläufige Mittel falsch als die Fixes.
  if (verwendet.length * 2 < brauchbar.length) verwendet = brauchbar;

  const punkt = gewichtetesMittel(verwendet);
  const summeGewichte = verwendet.reduce((s, f) => s + gewicht(f), 0);
  const zeiten = verwendet.map((f) => f.zeit_ms);
  const dauer_s = (Math.max(...zeiten) - Math.min(...zeiten)) / 1000;
  const unabhaengig = Math.min(verwendet.length, 1 + dauer_s / KORRELATIONSZEIT_S);
  const fehlerMittel = Math.sqrt(1 / summeGewichte) * Math.sqrt(verwendet.length / unabhaengig);
  const streuung = Math.sqrt(
    verwendet.reduce((s, f) => s + gewicht(f) * abstandM(f, punkt) ** 2, 0) / summeGewichte,
  );

  return {
    punkt,
    genauigkeit_m: Math.max(fehlerMittel, streuung),
    verwendet: verwendet.length,
    verworfen: eindeutig.length - verwendet.length,
  };
}

/** Stopp-Kriterium: genug Fixes und Zielgenauigkeit erreicht. */
export function zielErreicht(mittel: GpsMittel, ziel_m: number): boolean {
  return mittel.verwendet >= MIN_FIXES && mittel.genauigkeit_m !== null && mittel.genauigkeit_m <= ziel_m;
}
