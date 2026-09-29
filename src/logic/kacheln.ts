import type { Bereich } from './bereich';

// Kachelberechnung (Web-Mercator, XYZ-Schema) für den begrenzten Offline-Cache.

export interface Kachel {
  z: number;
  x: number;
  y: number;
}

const METER_PRO_GRAD_BREITE = 111_320;
const MAX_BREITE = 85.0511287798; // Grenze der Web-Mercator-Projektion

/** Vergrößert einen Bereich um einen Puffer in Metern. */
export function mitPuffer(bereich: Bereich, meter: number): Bereich {
  const [west, sued, ost, nord] = bereich;
  const mitteBreite = ((sued + nord) / 2) * (Math.PI / 180);
  const dBreite = meter / METER_PRO_GRAD_BREITE;
  const dLaenge = meter / (METER_PRO_GRAD_BREITE * Math.max(Math.cos(mitteBreite), 0.01));
  return [
    Math.max(west - dLaenge, -180),
    Math.max(sued - dBreite, -MAX_BREITE),
    Math.min(ost + dLaenge, 180),
    Math.min(nord + dBreite, MAX_BREITE),
  ];
}

function kachelX(laenge: number, z: number): number {
  const n = 2 ** z;
  return Math.min(n - 1, Math.max(0, Math.floor(((laenge + 180) / 360) * n)));
}

function kachelY(breite: number, z: number): number {
  const n = 2 ** z;
  const phi = (Math.max(-MAX_BREITE, Math.min(MAX_BREITE, breite)) * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n);
  return Math.min(n - 1, Math.max(0, y));
}

/** Alle Kacheln, die den Bereich in den Zoomstufen minZoom…maxZoom berühren. */
export function kachelnFuerBereich(bereich: Bereich, minZoom: number, maxZoom: number): Kachel[] {
  const [west, sued, ost, nord] = bereich;
  const kacheln: Kachel[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const x1 = kachelX(west, z), x2 = kachelX(ost, z);
    const y1 = kachelY(nord, z), y2 = kachelY(sued, z); // y wächst nach Süden
    for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) kacheln.push({ z, x, y });
  }
  return kacheln;
}

export function kachelUrl(vorlage: string, k: Kachel): string {
  return vorlage.replace('{z}', String(k.z)).replace('{x}', String(k.x)).replace('{y}', String(k.y));
}
