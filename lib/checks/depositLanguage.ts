import type { Finding, ParsedListing } from "./types";

/**
 * Deposit-trap language in the post body.
 *
 * The classic version: money is asked for before anyone sees the unit, and it
 * is asked for through a method that cannot be reversed. Neither fact needs a
 * paid provider - both live in text we already fetched.
 *
 * This check quotes what the post says and names why the phrase is worth
 * reading twice. It does not decide whether the listing is a scam. A landlord
 * asking for a deposit to hold a unit can be entirely legitimate; a student
 * who knows that is what they are being asked is simply harder to rush.
 *
 * Generic urgency is deliberately NOT matched. "Available now", "act fast",
 * "first come first served" appear in most honest rental ads, so flagging them
 * trains the reader to ignore this section - which costs more than it catches.
 */

const WHY =
  "Two things make a deposit unrecoverable: paying before you have seen the unit, and paying by a method with no chargeback. A scam needs both, so the language asking for them is the earliest warning a post gives. Plenty of honest landlords take a holding deposit — knowing that is what you are being asked for is what makes you harder to rush.";

interface Pattern {
  category: string;
  why: string;
  re: RegExp;
}

const PATTERNS: Pattern[] = [
  {
    category: "Payment that cannot be reversed",
    why: "Wires, gift cards, and cash apps have no chargeback. Legitimate landlords rarely insist on them for a deposit.",
    re: /\b(wire transfer|wiring|western union|moneygram|money gram|gift ?card|bitcoin|crypto(?:currency)?|zelle|cash ?app|venmo|money order)\b/gi,
  },
  {
    category: "Money before you see the unit",
    why: "Paying to hold a place you have not walked through is the single most common way deposits are lost.",
    re: /\b(sight unseen|deposit to hold|hold the (?:unit|apartment|place|property)|secure the (?:unit|apartment|place)|reserve the (?:unit|apartment)|before (?:any )?(?:viewing|showing|seeing)|prior to (?:viewing|showing))\b/gi,
  },
  {
    category: "Poster says they are not local",
    why: "An owner who cannot meet you, paired with a request for money, is the standard setup for a listing the poster does not control.",
    re: /\b(out of (?:the )?(?:country|state)|overseas|currently abroad|missionary|military deployment|deployed overseas|(?:mail|ship|send)(?:ing)? (?:you )?the keys|keys will be (?:mailed|shipped|sent))\b/gi,
  },
  {
    category: "Unit cannot be shown",
    why: "If nobody will let you inside before you pay, there may be nothing to go inside.",
    re: /\b(cannot show|can'?t show|unable to show|no (?:viewings?|showings?)|not available for (?:viewing|showing))\b/gi,
  },
];

/** A short window of the surrounding sentence, so the phrase is not read bare. */
function quoteAround(body: string, index: number, length: number) {
  const start = Math.max(0, index - 45);
  const end = Math.min(body.length, index + length + 45);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < body.length ? "…" : "";
  return `${prefix}${body.slice(start, end).trim()}${suffix}`;
}

export function checkDepositLanguage(listing: ParsedListing): Finding {
  const base: Finding = {
    id: "deposit-language",
    label: "How the post asks for money",
    state: "skipped",
    source: { label: "The listing text itself" },
  };

  const body = listing.body;
  if (!body || body.trim() === "") {
    return { ...base, reason: "The post has no body text to read." };
  }

  const hits: { category: string; why: string; quote: string }[] = [];
  const seen = new Set<string>();

  for (const pattern of PATTERNS) {
    // Fresh lastIndex per run; these regexes are module-level and global.
    pattern.re.lastIndex = 0;
    for (const match of body.matchAll(pattern.re)) {
      const key = `${pattern.category}:${match[0].toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({
        category: pattern.category,
        why: pattern.why,
        quote: quoteAround(body, match.index ?? 0, match[0].length),
      });
    }
  }

  if (hits.length === 0) {
    return {
      ...base,
      state: "found",
      note: "Nothing in the post asks for money up front, names an irreversible payment method, or says the unit cannot be shown. That is what an ordinary listing looks like — it is not a guarantee about anything that happens after you make contact.",
      why: WHY,
    };
  }

  const grouped = hits.reduce<Record<string, { why: string; quotes: string[] }>>(
    (acc, hit) => {
      acc[hit.category] ??= { why: hit.why, quotes: [] };
      acc[hit.category].quotes.push(hit.quote);
      return acc;
    },
    {},
  );

  const note = Object.entries(grouped)
    .map(
      ([category, { why, quotes }]) =>
        `${category} — ${why}\n${quotes.map((q) => `“${q}”`).join("\n")}`,
    )
    .join("\n\n");

  // No claim/found pair here: there is no outside source to set against the
  // post. The quotes below are the post's own words, and that is the finding.
  const count = `${hits.length} phrase${hits.length === 1 ? "" : "s"} worth reading twice, in ${Object.keys(grouped).length} categor${Object.keys(grouped).length === 1 ? "y" : "ies"}.`;

  return {
    ...base,
    state: "found",
    note: `${count}\n\n${note}`,
    why: WHY,
  };
}
