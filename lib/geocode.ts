import type { Coords } from "./types";

/**
 * Mapbox forward geocoding, so a checked listing lands on the map at its real
 * address instead of a hand-placed guess. Uses the same public token the map
 * already needs. Returns null rather than throwing - a listing without a pin is
 * a fine outcome, a crashed check is not.
 */
export async function geocode(address: string): Promise<Coords | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || address.trim() === "") return null;

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json` +
    `?access_token=${token}&limit=1&country=us`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    const center = data?.features?.[0]?.center;
    return Array.isArray(center) && center.length === 2
      ? [center[0], center[1]]
      : null;
  } catch {
    return null;
  }
}
