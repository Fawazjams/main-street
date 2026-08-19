/**
 * The investigation model.
 *
 * There is deliberately no score, verdict, or risk label anywhere in here. Each
 * check states what the post claims next to what an independent source actually
 * says, and leaves the reader to notice when those disagree. A badge reading
 * "looks safe" would invite someone to stop reading, and any number we computed
 * would be our opinion wearing the costume of a fact.
 */

export type FindingState = "found" | "not-found" | "skipped" | "error";

export interface Finding {
  id: string;
  label: string;
  state: FindingState;
  /** What the listing itself asserts. */
  claim?: string;
  /** What the independent lookup returned. */
  found?: string;
  /**
   * Overrides the "Records say" heading. Checks that read the post itself
   * rather than an outside source must not imply independent confirmation.
   */
  foundLabel?: string;
  /** A plain factual observation, e.g. "1.2 miles from the stated address". */
  note?: string;
  /** Why this check did not run, when it was skipped. */
  reason?: string;
  source?: { label: string; url?: string };
}

export interface ParsedListing {
  url: string;
  title: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  /** Craigslist publishes this as its own field, e.g. "$65 per person". */
  applicationFee: string | null;
  /** The Craigslist map pin. Posters can move this away from the real address. */
  pin: { lat: number; lng: number } | null;
  /** The address text shown under the map, when the poster supplied one. */
  mapAddress: string | null;
  body: string | null;
  postedAt: string | null;
  photos: string[];
  /** Phone numbers found in the post body, in E.164-ish digits. */
  bodyPhones: string[];
  bodyEmails: string[];
}

export interface Investigation {
  url: string;
  checkedAt: string;
  listing: ParsedListing;
  findings: Finding[];
}
