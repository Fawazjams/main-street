import type { Coords } from "./types";

/**
 * UT Austin, as far as the map is concerned.
 *
 * The outline is hand-drawn and approximate — roughly Guadalupe to the I-35
 * frontage, MLK up to Dean Keeton. OpenStreetMap has the real boundary but its
 * API is not reachable from here, and a hand-drawn shape that is honest about
 * being approximate beats a precise-looking one that is quietly wrong. It is
 * there to say "campus is over here", not to settle a property line.
 *
 * Walking times are measured to the Tower, which is both central and the thing
 * a student pictures when they say "campus".
 */
export const CAMPUS = {
  name: "UT Austin",
  /** Walking destination. The Main Building (the Tower). */
  center: [-97.7394, 30.2862] as Coords,
  /** Approximate main-campus outline, closed ring. */
  outline: [
    [-97.7425, 30.28],
    [-97.7425, 30.2905],
    [-97.733, 30.2905],
    [-97.733, 30.2925],
    [-97.727, 30.2925],
    [-97.7265, 30.286],
    [-97.729, 30.28],
    [-97.7425, 30.28],
  ] as Coords[],
} as const;
