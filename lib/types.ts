export type Coords = [lng: number, lat: number];

export interface Listing {
  id: string;
  title: string;
  /** Price stated in the listing body. This is what the UI displays. */
  bodyPrice: number;
  /**
   * Price stated in the listing title, when it disagrees with the body.
   * A mismatch is a signal worth surfacing, not a value to average away.
   */
  titlePrice?: number;
  bedrooms: number;
  bathrooms: number;
  address: string | null;
  /**
   * Why there is no address, when there isn't one. Plenty of real postings hold
   * the address back until you call or email, and students should see that up
   * front rather than assume the data is just missing.
   */
  addressStatus: "published" | "on-request";
  neighborhood?: string;
  /** null when the posting never published a location. The map skips these. */
  coords: Coords | null;
  sourceUrl: string;
  /** True once the listing has been through the background checker. */
  verified: boolean;
}

export const perPersonRent = (listing: Listing, people: number) =>
  Math.round(listing.bodyPrice / Math.max(people, 1));
