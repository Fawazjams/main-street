import type { Finding, ParsedListing } from "./types";

/**
 * Travis County appraisal records, via the county's public ArcGIS layer.
 *
 * Free, no key, sub-second. It answers "is this a real recorded parcel" and
 * returns the geographic ID and legal description. It does not carry owner
 * name - that field is not published on this layer - so this check confirms the
 * address exists on the tax roll rather than who holds title.
 *
 * Austin only. Every county runs its own appraisal district, so a second campus
 * means a second adapter behind this same Finding shape.
 */

const TCAD =
  "https://gis.traviscountytx.gov/server1/rest/services/Boundaries_and_Jurisdictions/TCAD_public/MapServer/0/query";

interface TcadAttributes {
  PROP_ID?: number;
  geo_id?: string;
  situs_address?: string;
  legal_desc?: string;
  sub_dec?: string;
}

/** "926 E. Dean Keeton" -> "926 E DEAN KEETON" for the county's LIKE match. */
const toSitusPrefix = (address: string) =>
  address
    .toUpperCase()
    .replace(/[.,]/g, "")
    .replace(/\bSTREET\b/, "ST")
    .replace(/\bAVENUE\b/, "AVE")
    .replace(/\bDRIVE\b/, "DR")
    .replace(/\bROAD\b/, "RD")
    .replace(/,?\s*(AUSTIN|TX|TEXAS)\b.*$/, "")
    .replace(/\s+\d{5}$/, "")
    .replace(/\s+/g, " ")
    .trim();

export async function checkParcel(listing: ParsedListing): Promise<Finding> {
  const base: Finding = {
    id: "parcel",
    label: "County property record",
    state: "skipped",
    source: { label: "Travis County appraisal district", url: "https://traviscad.org/" },
  };

  if (!listing.mapAddress) {
    return {
      ...base,
      reason: "The post does not state a street address, so there is nothing to look up.",
    };
  }

  const prefix = toSitusPrefix(listing.mapAddress);
  // Escape single quotes so an address cannot break out of the SQL-ish where.
  const where = `situs_address LIKE '${prefix.replace(/'/g, "''")}%'`;
  const params = new URLSearchParams({
    where,
    outFields: "PROP_ID,geo_id,situs_address,legal_desc,sub_dec",
    returnGeometry: "false",
    resultRecordCount: "1",
    f: "json",
  });

  try {
    const response = await fetch(`${TCAD}?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return { ...base, state: "error", reason: `County server returned ${response.status}.` };
    }
    const data = await response.json();
    const attrs: TcadAttributes | undefined = data?.features?.[0]?.attributes;

    if (!attrs?.geo_id) {
      return {
        ...base,
        state: "not-found",
        claim: listing.mapAddress,
        found: "No matching parcel on the Travis County tax roll",
        note: "The address in the post does not resolve to a recorded parcel. Often that is benign — a cross-street like \"45th and Speedway\" is not an address, and neither is a unit number on its own — but an address that simply does not exist looks the same from here.",
      };
    }

    return {
      ...base,
      state: "found",
      claim: listing.mapAddress,
      found: attrs.situs_address ?? prefix,
      note: `Recorded parcel ${attrs.geo_id}${attrs.sub_dec ? `, ${attrs.sub_dec} subdivision` : ""}.${attrs.legal_desc ? ` Legal description: ${attrs.legal_desc}.` : ""}`,
      why: "Every property that exists appears on the county tax roll with its own parcel number. Matching one confirms the address is a real place somebody owns — it says nothing about whether the poster is that owner, or has any right to rent it.",
    };
  } catch {
    return { ...base, state: "error", reason: "Could not reach the county records server." };
  }
}
