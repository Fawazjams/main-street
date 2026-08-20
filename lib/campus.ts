import type { Coords } from "./types";

/**
 * UT Austin, as far as the map is concerned.
 *
 * The outline is the real main-campus boundary from OpenStreetMap, by way of
 * Nominatim, simplified from 106 points to 38 with Douglas-Peucker. OSM returns
 * UT as a MultiPolygon of eleven rings because the university owns land all
 * over Austin — the Pickle campus up north among them — so the ring drawn here
 * is specifically the one containing the Tower. An earlier hand-drawn version
 * cut the southern third of campus off entirely.
 *
 * Walking times are measured to the Tower, which is both central and the thing
 * a student pictures when they say "campus".
 */
export const CAMPUS = {
  name: "UT Austin",
  /** Walking destination. The Main Building (the Tower). */
  center: [-97.7394, 30.2862] as Coords,
  /** Main-campus boundary, closed ring, west-to-east roughly Guadalupe to I-35. */
  outline: [
    [-97.74219, 30.28918],
    [-97.74135, 30.28909],
    [-97.74191, 30.28272],
    [-97.73987, 30.28252],
    [-97.7398, 30.28317],
    [-97.7403, 30.28321],
    [-97.74025, 30.28376],
    [-97.73899, 30.28368],
    [-97.73923, 30.28107],
    [-97.73434, 30.27971],
    [-97.73582, 30.27604],
    [-97.73262, 30.2751],
    [-97.73188, 30.27505],
    [-97.72967, 30.28087],
    [-97.72878, 30.28205],
    [-97.72747, 30.28318],
    [-97.72526, 30.28654],
    [-97.72734, 30.28723],
    [-97.72884, 30.28799],
    [-97.73002, 30.28891],
    [-97.73106, 30.28915],
    [-97.73238, 30.28909],
    [-97.73245, 30.28973],
    [-97.73337, 30.2895],
    [-97.73459, 30.29011],
    [-97.73498, 30.29116],
    [-97.73585, 30.2921],
    [-97.73621, 30.29285],
    [-97.73653, 30.29249],
    [-97.73654, 30.29159],
    [-97.73886, 30.29175],
    [-97.73896, 30.29085],
    [-97.74019, 30.29095],
    [-97.74013, 30.29183],
    [-97.74108, 30.29191],
    [-97.74134, 30.2894],
    [-97.74216, 30.28947],
    [-97.74219, 30.28918],
  ] as Coords[],
} as const;
