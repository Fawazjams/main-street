import type { Coords } from "./types";

/**
 * Mapbox forward geocoding, so a checked listing lands on the map at its real
 * address instead of a hand-placed guess. Returns null rather than throwing —
 * a listing without a pin is a fine outcome, a crashed check is not.
 *
 * This is the only Mapbox call that happens on the server. The map, the walking
 * routes and the static pin image all run in the browser, where the request
 * carries a Referer and Mapbox's URL restrictions can see it. A server request
 * has no Referer, so the moment the public token is restricted to our own
 * domain — which is the whole point of restricting it, since that token ships
 * inside the JavaScript bundle for anyone to lift — this call starts coming
 * back rejected, and the pin-vs-address and rent-vs-benchmark checks quietly
 * stop running on every listing.
 *
 * Hence a second token, unrestricted but never sent to the browser. Give it the
 * geocoding scope only, so lifting it out of a server log buys nothing else.
 */

// Falls back so an existing setup, or a fresh clone, keeps working with one
// token and no extra configuration. The fallback is exactly what breaks once
// the public token is URL-restricted, so it says so, once, in the server log
// rather than failing silently three checks later.
let warned = false;

function serverToken(): string | undefined {
  const dedicated = process.env.MAPBOX_SERVER_TOKEN;
  if (dedicated) return dedicated;

  const shared = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (shared && !warned) {
    warned = true;
    console.warn(
      "[geocode] No MAPBOX_SERVER_TOKEN, falling back to the public token. " +
        "That token is in the client bundle, so if it is ever URL-restricted " +
        "this call will start failing and listings will stop getting pins.",
    );
  }
  return shared;
}

export async function geocode(address: string): Promise<Coords | null> {
  const token = serverToken();
  if (!token || address.trim() === "") return null;

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json` +
    `?access_token=${token}&limit=1&country=us`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      // A restricted token rejects with 401/403 rather than an empty result,
      // which is worth telling apart from "no such address".
      console.warn(`[geocode] Mapbox returned ${response.status} for "${address}".`);
      return null;
    }
    const data = await response.json();
    const center = data?.features?.[0]?.center;
    return Array.isArray(center) && center.length === 2
      ? [center[0], center[1]]
      : null;
  } catch {
    return null;
  }
}
