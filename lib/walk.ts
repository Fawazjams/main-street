import { CAMPUS } from "./campus";
import type { Coords } from "./types";

/**
 * Walking route from a listing to campus.
 *
 * Directions rather than the Matrix API, even though Matrix would fetch every
 * listing in one request: Matrix and Directions disagree by a couple of minutes
 * on the same pair, and a card reading "18 min" beside a line drawn as a
 * 20-minute route is the kind of small lie that costs trust. One call per
 * listing keeps the number and the drawn path the same thing.
 *
 * Bikes and cars are the same endpoint with a different profile, when wanted.
 */

export interface WalkRoute {
  minutes: number;
  miles: number;
  /** The real path, for drawing. */
  geometry: Coords[];
}

const cache = new Map<string, WalkRoute | null>();
const keyFor = (from: Coords) => `${from[0].toFixed(5)},${from[1].toFixed(5)}`;

export async function walkToCampus(from: Coords): Promise<WalkRoute | null> {
  const key = keyFor(from);
  if (cache.has(key)) return cache.get(key) ?? null;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/` +
    `${from[0]},${from[1]};${CAMPUS.center[0]},${CAMPUS.center[1]}` +
    `?access_token=${token}&overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }
    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) {
      cache.set(key, null);
      return null;
    }

    const result: WalkRoute = {
      minutes: Math.round(route.duration / 60),
      miles: route.distance / 1609.34,
      geometry: route.geometry?.coordinates ?? [],
    };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
