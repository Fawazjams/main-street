import { parseListing } from "./parseListing";
import { checkParcel } from "./parcel";
import { checkPinDistance } from "./pinDistance";
import { checkPhoneRegion } from "./areaCode";
import { checkMarketRent } from "./market";
import type { Investigation, ParsedListing } from "./types";

export interface InvestigationResult extends Investigation {
  /** Where the stated address geocodes to, when it could be resolved. */
  geocoded: { lat: number; lng: number } | null;
}

/**
 * Runs every check against one parsed listing.
 *
 * The lookups are independent, so they run concurrently - the slowest is a
 * couple of seconds, which is why this fits in a single request rather than
 * needing the streaming, task-polling arrangement a multi-minute pipeline does.
 * Order in the output is fixed rather than completion-ordered so the page does
 * not reshuffle between runs.
 */
export async function investigate(url: string): Promise<InvestigationResult> {
  const listing: ParsedListing = await parseListing(url);

  const [parcel, pin, market] = await Promise.all([
    checkParcel(listing),
    checkPinDistance(listing),
    checkMarketRent(listing),
  ]);
  const phone = checkPhoneRegion(listing);

  return {
    url,
    checkedAt: new Date().toISOString(),
    listing,
    geocoded: pin.geocoded,
    findings: [pin.finding, parcel, market, phone],
  };
}
