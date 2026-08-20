import type { Listing } from "@/lib/types";
import type { InvestigationResult } from "./investigate";

/**
 * Turns an investigated post into a map listing.
 *
 * The geocoded address wins over the Craigslist pin when both exist: the pin is
 * poster-controlled and the geocode is not. Where they disagree, the finding
 * already says so - the map should show the address the post claims to be at.
 */
export function toMapListing(result: InvestigationResult): Listing | null {
  const { listing, geocoded } = result;
  if (listing.price === null) return null;

  const point = geocoded ?? listing.pin;

  // Pasted text has no URL, so identity falls back to what the listing says it
  // is. Two pastes of the same post then still land on one pin.
  const identity =
    listing.url || `pasted:${listing.title ?? ""}|${listing.mapAddress ?? ""}`;

  return {
    id: `cl-${Buffer.from(identity).toString("base64url").slice(0, 16)}`,
    title: listing.title ?? "Craigslist listing",
    bodyPrice: listing.price,
    bedrooms: listing.bedrooms ?? 1,
    bathrooms: listing.bathrooms ?? 1,
    address: listing.mapAddress,
    addressStatus: listing.mapAddress ? "published" : "on-request",
    coords: point ? [point.lng, point.lat] : null,
    photos: listing.photos,
    sourceUrl: identity,
    verified: true,
  };
}
