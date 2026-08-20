import { geocode } from "@/lib/geocode";
import type { Finding, ParsedListing } from "./types";

/**
 * Craigslist map pin against the address the poster typed.
 *
 * Craigslist lets a poster drag the pin anywhere, independently of the address
 * text. When the two disagree by a meaningful distance, that gap is the single
 * most legible signal on the page - you can see it on a map without reading a
 * word. This check states the distance and says nothing about what it means.
 */

const EARTH_MILES = 3958.8;

export function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.sqrt(h));
}

export interface PinDistanceResult {
  finding: Finding;
  /** Where the stated address actually geocodes to, for the map. */
  geocoded: { lat: number; lng: number } | null;
}

export async function checkPinDistance(
  listing: ParsedListing,
): Promise<PinDistanceResult> {
  const base: Finding = {
    id: "pin-distance",
    label: "Map pin vs stated address",
    state: "skipped",
    source: { label: "Mapbox geocoding" },
  };

  if (!listing.pin) {
    return { finding: { ...base, reason: "The post has no map pin." }, geocoded: null };
  }
  if (!listing.mapAddress) {
    return {
      finding: {
        ...base,
        reason:
          "The post has a pin but no street address, so there is nothing to compare it against.",
      },
      geocoded: null,
    };
  }

  const coords = await geocode(`${listing.mapAddress}, Austin, TX`);
  if (!coords) {
    return {
      finding: {
        ...base,
        state: "not-found",
        claim: listing.mapAddress,
        found: "The stated address could not be geocoded",
      },
      geocoded: null,
    };
  }

  const geocoded = { lng: coords[0], lat: coords[1] };
  const miles = milesBetween(listing.pin, geocoded);
  const distance =
    miles < 0.1
      ? `${Math.round(miles * 5280)} feet`
      : `${miles.toFixed(miles < 10 ? 1 : 0)} miles`;

  return {
    finding: {
      ...base,
      state: "found",
      claim: `Pin dropped at ${listing.pin.lat.toFixed(5)}, ${listing.pin.lng.toFixed(5)}`,
      found: `${listing.mapAddress} is at ${geocoded.lat.toFixed(5)}, ${geocoded.lng.toFixed(5)}`,
      note: `The map pin sits ${distance} from the address written in the post.`,
      why: "Craigslist lets a poster drag the pin anywhere, independently of the address they type. Real listings put the two in the same place, give or take the width of a building. A pin a long way from its own address means one of the two is not where the unit is.",
      data: {
        kind: "pin-map",
        pin: listing.pin,
        geocoded,
        miles,
        address: listing.mapAddress,
      },
    },
    geocoded,
  };
}
