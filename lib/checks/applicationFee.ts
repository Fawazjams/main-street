import type { Finding, ParsedListing } from "./types";

/**
 * Application fees.
 *
 * Fee churning is collecting application fees from many people with no real
 * intent to lease to any of them. A single post never proves that - the pattern
 * only appears across many listings from the same poster over time, which is
 * why this check states the cost plainly and stops there.
 *
 * The corpus that would make churn detectable is the one the map accumulates as
 * students check listings. Until listings persist, this reports the fee and the
 * household total so nobody is surprised at the leasing office.
 */

/** "$65 per person", "$50/adult", "65 dollars each" */
const FEE_IN_BODY =
  /\$\s?(\d{2,4})(?:\.\d{2})?\s*(?:non-?refundable\s*)?(?:application|app|processing|admin(?:istrative)?)\s*fee|(?:application|app|processing|admin(?:istrative)?)\s*fee[^.\n]{0,30}?\$\s?(\d{2,4})/i;

const PER_PERSON = /\b(per person|per adult|each adult|per applicant|\/\s*person|each)\b/i;

const WHY =
  "Fee churning is collecting application fees from a queue of people with no intention of leasing to any of them. A single post can never show that — the pattern only appears across many listings from one poster over time. What matters here is knowing exactly what applying costs, and that it is usually gone whether or not you get the unit.";

const dollars = (n: number) => `$${n.toLocaleString()}`;

export function checkApplicationFee(listing: ParsedListing): Finding {
  const base: Finding = {
    id: "application-fee",
    label: "Application fee",
    state: "skipped",
    source: { label: "The listing's own fields" },
  };

  // Craigslist's dedicated field is authoritative when present; the body is the
  // fallback, since plenty of posters type the fee into the description instead.
  const stated = listing.applicationFee;
  let amount: number | null = null;
  let text: string | null = stated;

  if (stated) {
    const match = stated.match(/\$?\s?(\d{2,4})/);
    amount = match ? Number(match[1]) : null;
  } else if (listing.body) {
    const match = listing.body.match(FEE_IN_BODY);
    if (match) {
      amount = Number(match[1] ?? match[2]);
      // Take a little trailing context too: the qualifier that matters most
      // ("per person") usually sits just past the amount, outside the match.
      const start = match.index ?? 0;
      text = listing.body
        .slice(start, start + match[0].length + 25)
        // Do not end mid-word when the window cuts the sentence short.
        .replace(/\s+\S*$/, "")
        .replace(/[,;]$/, "")
        .trim();
    }
  }

  if (amount === null && !text) {
    return {
      ...base,
      state: "not-found",
      note: "The post does not publish an application fee. That does not mean there is none — ask what it costs to apply, and whether it is refundable, before you fill anything in.",
      why: WHY,
    };
  }

  const perPerson = PER_PERSON.test(text ?? "");
  const occupants = listing.bedrooms && listing.bedrooms > 1 ? listing.bedrooms : 1;
  const household = perPerson && amount !== null ? amount * occupants : amount;

  const parts: string[] = [];
  if (perPerson && amount !== null && occupants > 1) {
    parts.push(
      `Charged per person, so a group of ${occupants} filling the ${occupants} bedrooms pays ${dollars(household!)} in total before anyone signs a lease.`,
    );
  }
  parts.push(
    "Application fees are usually non-refundable and are charged whether or not you get the unit. Ask how many applications are already in before paying.",
  );

  // The post's own wording on the left, our plain reading of it on the right.
  const reading =
    amount === null
      ? "Fee mentioned without an amount"
      : perPerson && occupants > 1
        ? `${dollars(amount)} per person — ${dollars(household!)} for ${occupants}`
        : `${dollars(amount)}${perPerson ? " per person" : ""}`;

  const quoted = stated ?? text ?? dollars(amount!);

  // Only show the two-column comparison when the second column adds something -
  // for a single applicant there is no arithmetic to do, so the fee just goes
  // in the note rather than being restated beside itself.
  if (reading === quoted) {
    return {
      ...base,
      state: "found",
      note: `The post lists an application fee of ${quoted}. ${parts.join(" ")}`,
      why: WHY,
    };
  }

  return {
    ...base,
    state: "found",
    claim: quoted,
    // Nothing independent backs this up - it is the post's own number, read
    // back plainly. Showing it as "records say" would overclaim.
    foundLabel: "Which works out to",
    found: reading,
    note: parts.join(" "),
    why: WHY,
  };
}
