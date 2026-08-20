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

  const [parcel, pin, market, license] = await Promise.all([
    checkParcel(listing),
    checkPinDistance(listing),
    checkMarketRent(listing),
    checkLicense(listing),
  ]);
  // These read text we already have, so they cost nothing and cannot fail on
  // the network - no reason to await them alongside the remote lookups.
  const phone = checkPhoneRegion(listing);
  const deposit = checkDepositLanguage(listing);
  const fee = checkApplicationFee(listing);

  // Only Craigslist gives us a pin to compare against, so the distance check is
  // the only thing that geocodes. Everything else still deserves a map pin.
  let geocoded = pin.geocoded;
  if (!geocoded && listing.mapAddress) {
    const coords = await geocode(listing.mapAddress);
    if (coords) geocoded = { lng: coords[0], lat: coords[1] };
  }

  return {
    url: listing.url,
    checkedAt: new Date().toISOString(),
    listing,
    geocoded,
    readBy,
    findings: [pin.finding, parcel, market, deposit, fee, license, phone],
  };
}
