import type { Finding, ParsedListing } from "./types";

/**
 * Asking rent against HUD's Fair Market Rent for the listing's own county.
 *
 * Rent far below the local benchmark is the highest-precision rental-scam
 * signal there is, and it is one a cloned listing cannot fake - the whole point
 * of the clone is to look like a bargain. Both halves are free: the Census
 * geocoder maps the map pin to a county with no key at all, and HUD publishes
 * Fair Market Rents behind a free token.
 *
 * Without HUD_API_TOKEN the check skips and says so rather than guessing.
 */

const CENSUS =
  "https://geocoding.geo.census.gov/geocoder/geographies/coordinates";
const HUD = "https://www.huduser.gov/hudapi/public/fmr/data";

async function countyGeoid(lat: number, lng: number): Promise<string | null> {
  const params = new URLSearchParams({
    x: String(lng),
    y: String(lat),
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    layers: "Counties",
    format: "json",
  });
  try {
    const response = await fetch(`${CENSUS}?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.result?.geographies?.Counties?.[0]?.GEOID ?? null;
  } catch {
    return null;
  }
}

/** HUD keys county entities as the 5-digit FIPS followed by 99999. */
const hudEntityId = (geoid: string) => `${geoid}99999`;

/**
 * HUD names its rent fields in words, and returns them as strings ("948.0")
 * rather than numbers. `basicdata` is an object for a plain county lookup, but
 * an array when the area reports small-area (ZIP-level) rents.
 */
const BEDROOM_KEY = [
  "Efficiency",
  "One-Bedroom",
  "Two-Bedroom",
  "Three-Bedroom",
  "Four-Bedroom",
] as const;

function fmrForBedrooms(basicdata: unknown, bedrooms: number): number | null {
  const record = (Array.isArray(basicdata) ? basicdata[0] : basicdata) as
    | Record<string, unknown>
    | undefined;
  if (!record) return null;

  const key = BEDROOM_KEY[Math.max(0, Math.min(4, Math.round(bedrooms)))];
  const raw = record[key];
  const value = Number(raw);
  return typeof raw !== "undefined" && raw !== null && !Number.isNaN(value) ? value : null;
}

export async function checkMarketRent(listing: ParsedListing): Promise<Finding> {
  const base: Finding = {
    id: "market-rent",
    label: "Rent vs local benchmark",
    state: "skipped",
    source: {
      label: "HUD Fair Market Rents",
      url: "https://www.huduser.gov/portal/dataset/fmr-api.html",
    },
  };

  const token = process.env.HUD_API_TOKEN;
  if (!token) {
    return {
      ...base,
      reason:
        "Needs a free HUD API token. Register at huduser.gov and set HUD_API_TOKEN in .env.local.",
    };
  }
  if (!listing.pin) {
    return { ...base, reason: "The post has no map pin, so the county is unknown." };
  }
  if (listing.price === null) {
    return { ...base, reason: "The post states no price." };
  }

  const geoid = await countyGeoid(listing.pin.lat, listing.pin.lng);
  if (!geoid) {
    return { ...base, state: "error", reason: "Could not resolve the pin to a county." };
  }

  try {
    const response = await fetch(`${HUD}/${hudEntityId(geoid)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return { ...base, state: "error", reason: `HUD returned ${response.status}.` };
    }
    const payload = await response.json();
    const data = payload?.data ?? {};
    const area: string =
      data.area_name ?? data.metro_name ?? data.county_name ?? "this county";
    const bedrooms = listing.bedrooms ?? 1;
    const fmr = fmrForBedrooms(data.basicdata, bedrooms);
    const year: string | undefined = (
      Array.isArray(data.basicdata) ? data.basicdata[0] : data.basicdata
    )?.year;

    if (fmr === null) {
      return { ...base, state: "not-found", reason: "HUD returned no rent for this bedroom count." };
    }

    const delta = ((listing.price - fmr) / fmr) * 100;
    const direction = delta < 0 ? "below" : "above";
    return {
      ...base,
      state: "found",
      claim: `Asking $${listing.price.toLocaleString()}/mo for ${bedrooms} bedroom${bedrooms === 1 ? "" : "s"}`,
      found: `HUD Fair Market Rent for ${area}${year ? ` (${year})` : ""} is $${fmr.toLocaleString()}/mo`,
      note: `The asking rent is ${Math.abs(delta).toFixed(0)}% ${direction} the benchmark. Fair Market Rent is HUD's 40th-percentile figure for a standard unit, so a modest gap either way is ordinary; a listing far below it is the number worth pausing on.`,
    };
  } catch {
    return { ...base, state: "error", reason: "Could not reach HUD." };
  }
}
