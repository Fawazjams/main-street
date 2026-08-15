import type { Finding, ParsedListing } from "./types";

/**
 * Offline area-code region tagging.
 *
 * This is not a reverse phone lookup - it does not identify a person, and it
 * cannot, without a paid provider. It answers one narrow question for free: is
 * the number the poster typed even from the region the listing is in? An Austin
 * apartment advertised with an out-of-state cell is not proof of anything, but
 * it is a fact a student should get to see.
 *
 * The table is partial by design. An unlisted code returns null and the check
 * says so, rather than guessing a region.
 */
const AREA_CODES: Record<string, string> = {
  // Texas
  "512": "Austin, TX", "737": "Austin, TX", "254": "Waco, TX", "979": "Bryan-College Station, TX",
  "214": "Dallas, TX", "469": "Dallas, TX", "972": "Dallas, TX", "945": "Dallas, TX",
  "817": "Fort Worth, TX", "682": "Fort Worth, TX", "903": "Northeast Texas", "430": "Northeast Texas",
  "713": "Houston, TX", "281": "Houston, TX", "832": "Houston, TX", "346": "Houston, TX",
  "210": "San Antonio, TX", "726": "San Antonio, TX", "915": "El Paso, TX", "806": "Texas Panhandle",
  "409": "Beaumont, TX", "936": "Huntsville, TX", "940": "Wichita Falls, TX", "325": "Abilene, TX",
  "361": "Corpus Christi, TX", "956": "Rio Grande Valley, TX", "432": "Midland-Odessa, TX",
  // California
  "415": "San Francisco, CA", "628": "San Francisco, CA", "510": "Oakland, CA", "341": "Oakland, CA",
  "650": "San Mateo, CA", "408": "San Jose, CA", "669": "San Jose, CA", "925": "East Bay, CA",
  "707": "Santa Rosa, CA", "916": "Sacramento, CA", "213": "Los Angeles, CA", "323": "Los Angeles, CA",
  "310": "West Los Angeles, CA", "424": "West Los Angeles, CA", "818": "San Fernando Valley, CA",
  "747": "San Fernando Valley, CA", "626": "Pasadena, CA", "562": "Long Beach, CA",
  "619": "San Diego, CA", "858": "San Diego, CA", "760": "North San Diego, CA",
  // Other major metros
  "212": "New York, NY", "646": "New York, NY", "332": "New York, NY", "917": "New York, NY",
  "718": "New York, NY", "347": "New York, NY", "929": "New York, NY",
  "312": "Chicago, IL", "773": "Chicago, IL", "872": "Chicago, IL",
  "305": "Miami, FL", "786": "Miami, FL", "407": "Orlando, FL", "689": "Orlando, FL", "813": "Tampa, FL",
  "404": "Atlanta, GA", "470": "Atlanta, GA", "678": "Atlanta, GA",
  "617": "Boston, MA", "857": "Boston, MA", "206": "Seattle, WA",
  "503": "Portland, OR", "971": "Portland, OR",
  "602": "Phoenix, AZ", "480": "Phoenix, AZ", "623": "Phoenix, AZ",
  "702": "Las Vegas, NV", "725": "Las Vegas, NV", "303": "Denver, CO", "720": "Denver, CO",
  "801": "Salt Lake City, UT", "385": "Salt Lake City, UT", "615": "Nashville, TN",
  "202": "Washington, DC", "215": "Philadelphia, PA", "267": "Philadelphia, PA",
  "313": "Detroit, MI", "216": "Cleveland, OH", "614": "Columbus, OH", "513": "Cincinnati, OH",
  "314": "St Louis, MO", "816": "Kansas City, MO", "612": "Minneapolis, MN",
  "704": "Charlotte, NC", "980": "Charlotte, NC", "919": "Raleigh, NC", "984": "Raleigh, NC",
  "504": "New Orleans, LA", "505": "New Mexico", "208": "Idaho", "907": "Alaska", "808": "Hawaii",
};

const TOLL_FREE = new Set(["800", "888", "877", "866", "855", "844", "833"]);

export const regionForAreaCode = (areaCode: string): string | null => {
  if (TOLL_FREE.has(areaCode)) return "Toll-free";
  return AREA_CODES[areaCode] ?? null;
};

const format = (digits: string) =>
  `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;

export function checkPhoneRegion(listing: ParsedListing): Finding {
  const base: Finding = {
    id: "phone-region",
    label: "Contact number",
    state: "skipped",
    source: { label: "Offline area-code table" },
  };

  if (listing.bodyPhones.length === 0) {
    return {
      ...base,
      reason:
        "The post publishes no phone number - replies go through Craigslist's relay. Recovering the real contact needs a browser that can clear their captcha, which this build does not do.",
    };
  }

  const described = listing.bodyPhones.map((digits) => {
    const region = regionForAreaCode(digits.slice(0, 3));
    return `${format(digits)} — ${region ?? `area code ${digits.slice(0, 3)}, not in our table`}`;
  });

  const anyKnown = listing.bodyPhones.some((d) => regionForAreaCode(d.slice(0, 3)));

  return {
    ...base,
    state: "found",
    claim: `${listing.bodyPhones.length} number${listing.bodyPhones.length > 1 ? "s" : ""} in the post`,
    found: described.join("; "),
    note: anyKnown
      ? "Area code shows where the number was issued, not where its owner is now. A mismatch with the listing's city is worth noticing, not conclusive."
      : undefined,
  };
}
