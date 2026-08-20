import { parseListing } from "./parseListing";
import { parseWithClaude } from "./parseWithClaude";
import { fetchPublicPage, htmlToText } from "./safeFetch";
import { checkParcel } from "./parcel";
import { checkPinDistance } from "./pinDistance";
import { checkPhoneRegion } from "./areaCode";
import { checkMarketRent } from "./market";
import { checkDepositLanguage } from "./depositLanguage";
import { checkApplicationFee } from "./applicationFee";
import { checkLicense } from "./license";
import { geocode } from "@/lib/geocode";
import type { Investigation, ParsedListing } from "./types";

export interface InvestigationResult extends Investigation {
  /** Where the stated address geocodes to, when it could be resolved. */
  geocoded: { lat: number; lng: number } | null;
  /** How the listing was read, so the UI can be honest about it. */
  readBy: "craigslist-parser" | "claude";
}

export type InvestigationInput =
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

const isCraigslist = (url: string) => {
  try {
    return /(^|\.)craigslist\.org$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

/**
 * Craigslist prints a bare street address like "926 E. Dean Keeton" with no
 * city, so the campus has to be supplied. A pasted listing usually carries the
 * full address already. The Austin default is the demo assumption to revisit
 * when the school picker lands.
 */
async function geocodeAddress(address: string) {
  const query = address.includes(",") ? address : `${address}, Austin, TX`;
  const coords = await geocode(query);
  return coords ? { lng: coords[0], lat: coords[1] } : null;
}

async function read(
  input: InvestigationInput,
): Promise<{ listing: ParsedListing; readBy: InvestigationResult["readBy"] }> {
  if (input.kind === "text") {
    return { listing: await parseWithClaude(input), readBy: "claude" };
  }
  // Craigslist has one stable shape, so the free regex parser handles it.
  if (isCraigslist(input.url)) {
    return { listing: await parseListing(input.url), readBy: "craigslist-parser" };
  }
  const html = await fetchPublicPage(input.url);
  return {
    listing: await parseWithClaude({
      kind: "url",
      url: input.url,
      text: htmlToText(html),
    }),
    readBy: "claude",
  };
}

/**
 * Runs every check against one listing, wherever it came from.
 *
 * The lookups are independent, so they run concurrently - the slowest is a
 * couple of seconds, which is why this fits in a single request rather than
 * needing the streaming, task-polling arrangement a multi-minute pipeline does.
 * Order in the output is fixed rather than completion-ordered so the page does
 * not reshuffle between runs.
 */
export async function investigate(
  input: InvestigationInput,
): Promise<InvestigationResult> {
  const { listing, readBy } = await read(input);

  // Resolved once, up front. Two checks need a coordinate and a pasted listing
  // has no pin at all, so geocoding inside the pin check left the rent
  // benchmark with nothing to work from.
  const geocoded = listing.mapAddress ? await geocodeAddress(listing.mapAddress) : null;
  const point = listing.pin ?? geocoded;

  const [parcel, pin, market, license] = await Promise.all([
    checkParcel(listing),
    checkPinDistance(listing, geocoded),
    checkMarketRent(listing, point),
    checkLicense(listing),
  ]);
  // These read text we already have, so they cost nothing and cannot fail on
  // the network - no reason to await them alongside the remote lookups.
  const phone = checkPhoneRegion(listing);
  const deposit = checkDepositLanguage(listing);
  const fee = checkApplicationFee(listing);

  return {
    url: listing.url,
    checkedAt: new Date().toISOString(),
    listing,
    geocoded,
    readBy,
    findings: [pin.finding, parcel, market, deposit, fee, license, phone],
  };
}
