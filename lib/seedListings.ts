import type { Listing } from "./types";

/**
 * Three real Austin Craigslist postings, transcribed by hand.
 *
 * Coordinates come from geocoding each published address, the same path the
 * checker uses, so seeded and checked listings agree. Swap this whole file for a
 * Supabase query when the backend lands - everything downstream reads Listing[].
 */
export const seedListings: Listing[] = [
  {
    id: "cl-dean-keeton",
    title: "Furnished one bedroom across from UT campus",
    bodyPrice: 1350,
    bedrooms: 1,
    bathrooms: 1,
    address: "926 E. Dean Keeton St, Austin, TX 78705",
    addressStatus: "published",
    neighborhood: "North campus",
    coords: [-97.72693, 30.28781],
    sourceUrl:
      "https://www.craigslist.org/view/d/austin-furnished-one-bedroom-across/oiMsh2XL43E1XXAmCAADui",
    verified: false,
  },
  {
    id: "cl-45th-speedway",
    title: "Best two bedroom bargain in the UT area",
    // The posting contradicts itself: the title advertises $1,095 ($548/bed),
    // the body says $1,025 ($513/bed). Only the body figure divides evenly by
    // two, so that is the one shown. The checker should flag this.
    bodyPrice: 1025,
    titlePrice: 1095,
    bedrooms: 2,
    bathrooms: 1,
    address: "45th and Speedway, Austin, TX 78705",
    addressStatus: "published",
    neighborhood: "North campus",
    coords: [-97.72841, 30.30866],
    sourceUrl:
      "https://www.craigslist.org/view/d/austin-best-two-bedroom-bargain-in-the/s77LsMtYuErRrMtQot4qMz",
    verified: false,
  },
  {
    id: "cl-remodeled-interior",
    title: "Remodeled interior, refinished wood floors, stainless appliances",
    bodyPrice: 2300,
    bedrooms: 2,
    bathrooms: 1,
    // The posting withholds the address until you email, text, or call. That is
    // a fact about the listing worth showing, not a hole in the data.
    address: null,
    addressStatus: "on-request",
    coords: null,
    sourceUrl:
      "https://www.craigslist.org/view/d/austin-remodeled-interior-refinished/mSno6h8YWaYTbSCqU3MRPB",
    verified: false,
  },
];
