/**
 * The card accent colours.
 *
 * Purely to tell adjacent cards apart - the colour carries no meaning, and
 * nothing should ever be inferred from which one a listing gets. That is why it
 * is derived from the id rather than the position: a listing keeps its colour
 * when the seed array is replaced by the shared map, and nobody can read a
 * ranking into a row that reshuffles.
 *
 * Green is deliberately not in the rotation. It is the app's action colour and
 * the colour of the walking route on the map, and a card wearing it would look
 * like it had been picked out.
 */

export interface Accent {
  /** Tailwind border utility, for the card edge. */
  border: string;
  /** Tailwind background utility, for the photo placeholder band. */
  tint: string;
}

const ACCENTS: Accent[] = [
  { border: "border-blush", tint: "bg-blush-tint" },
  { border: "border-sky", tint: "bg-sky-tint" },
  { border: "border-gold", tint: "bg-gold-tint" },
];

export function accentFor(id: string): Accent {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}
