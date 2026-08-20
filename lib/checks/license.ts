import type { Finding, ParsedListing } from "./types";

/**
 * Texas real estate licence register.
 *
 * TREC publishes every active broker and sales agent to the Texas Open Data
 * Portal, refreshed daily, queryable over Socrata's free JSON API with no key.
 * For a listing that names an agent, that is an authoritative answer to "is
 * this a real licensed person" - better than asking a model to search the web,
 * for the same reason county records beat asking one about a parcel.
 *
 * Scope is deliberately narrow. This only looks up a name the poster chose to
 * publish, and only asks whether that name holds a licence. It does not profile
 * anyone, and nothing here infers a name from an address or a phone number.
 *
 * The match is on name alone, which is worth stating plainly wherever the
 * result is shown: anyone can type a licensed agent's name into a post.
 */

const TREC = "https://data.texas.gov/resource/s7ft-44qi.json";

interface TrecRow {
  full_name?: string;
  license_type?: string;
  license_number?: string;
  status?: string;
  license_expiration_date?: string;
  related_license_full_name?: string;
}

/** Socrata SoQL takes single quotes doubled, like SQL. */
const quote = (value: string) => value.replace(/'/g, "''");

async function search(pattern: string): Promise<TrecRow[]> {
  const params = new URLSearchParams({
    $where: `upper(full_name) like '${quote(pattern)}'`,
    $limit: "6",
  });
  try {
    const response = await fetch(`${TREC}?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return [];
    return (await response.json()) as TrecRow[];
  } catch {
    return [];
  }
}

/** "Norice Taylor" -> "%NORICE%TAYLOR%" so middle names still match. */
function personPattern(name: string): string | null {
  const parts = name
    .toUpperCase()
    .replace(/[^A-Z\s'-]/g, "")
    .split(/\s+/)
    .filter((part) => part.length > 1);
  if (parts.length < 2) return null;
  return `%${parts[0]}%${parts[parts.length - 1]}%`;
}

const describe = (row: TrecRow) => {
  const detail = [
    row.license_type,
    row.license_number ? `licence ${row.license_number}` : null,
    row.status,
    row.license_expiration_date ? `expires ${row.license_expiration_date}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return detail ? `${row.full_name} — ${detail}` : `${row.full_name}`;
};

/** Ignores punctuation and entity suffixes when comparing two company names. */
const normalizeOrg = (name: string) =>
  name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\b(LLC|INC|LP|LTD|CO|COMPANY|CORP)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function checkLicense(listing: ParsedListing): Promise<Finding> {
  const base: Finding = {
    id: "license",
    label: "Named contact",
    state: "skipped",
    source: {
      label: "Texas Real Estate Commission, via Texas Open Data",
      url: "https://data.texas.gov/d/s7ft-44qi",
    },
    why: "Texas requires anyone leasing property on someone else's behalf to hold a real estate licence, and the register is public and updated daily. A named agent who holds an active licence has something real to lose, which a scammer does not. Read it narrowly though: this matches on name only. Anyone can type a licensed agent's name into a post, so a hit says the name belongs to a real licence holder — not that they wrote the ad.",
  };

  if (!listing.contactName && !listing.contactOrg) {
    return {
      ...base,
      reason:
        "The post names no contact, so there is nothing to look up. We only check names a poster published — never one worked out from the address or phone number.",
    };
  }

  const claim = [listing.contactName, listing.contactOrg].filter(Boolean).join(", ");
  const lines: string[] = [];
  let anyHit = false;

  if (listing.contactName) {
    const pattern = personPattern(listing.contactName);
    const rows = pattern ? await search(pattern) : [];
    if (rows.length === 1) {
      anyHit = true;
      lines.push(`${listing.contactName}: ${describe(rows[0])}.`);
    } else if (rows.length > 1) {
      anyHit = true;
      lines.push(
        `${listing.contactName}: ${rows.length} licence holders share this name — ${rows
          .map((row) => `${row.full_name} (${row.license_number}, ${row.status})`)
          .join("; ")}. Which one, if any, wrote the post is not something the register can say.`,
      );
    } else {
      lines.push(
        `${listing.contactName}: no active Texas real estate licence under this name. Not every legitimate landlord needs one — an owner letting their own property does not — but an agent or property manager does.`,
      );
    }
  }

  if (listing.contactOrg) {
    const rows = await search(`%${listing.contactOrg.toUpperCase()}%`);
    if (rows.length === 1) {
      anyHit = true;
      const exact =
        normalizeOrg(rows[0].full_name ?? "") === normalizeOrg(listing.contactOrg);
      lines.push(
        exact
          ? `${listing.contactOrg}: ${describe(rows[0])}.`
          : `${listing.contactOrg}: the closest licensed company is ${describe(rows[0])}. That is a partial name match, not the same name, so treat it as a lead rather than a confirmation.`,
      );
    } else if (rows.length > 1) {
      anyHit = true;
      lines.push(
        `${listing.contactOrg}: ${rows.length} licensed companies contain this name, so a match here is weak — ${rows
          .map((row) => row.full_name)
          .join("; ")}.`,
      );
    } else {
      lines.push(`${listing.contactOrg}: no licensed company found under this name.`);
    }
  }

  return {
    ...base,
    state: anyHit ? "found" : "not-found",
    claim,
    foundLabel: "State licence register",
    found: anyHit ? "Matched the register" : "No licence found",
    note: lines.join("\n\n"),
  };
}
