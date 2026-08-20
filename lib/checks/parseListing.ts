import type { ParsedListing } from "./types";

/**
 * Craigslist post parser.
 *
 * A plain fetch with a browser user agent gets the full page - Craigslist only
 * gates the reply contact behind its captcha, not the post itself. Everything
 * here is regex against the served HTML rather than a DOM library, because the
 * markup is stable, hand-written, and tiny (~26KB).
 *
 * The map pin is the interesting field. Craigslist lets a poster drag it away
 * from the address they typed, so pin and address disagreeing is a fact worth
 * showing rather than an error to reconcile.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const first = (html: string, re: RegExp): string | null => {
  const match = html.match(re);
  return match ? match[1].trim() : null;
};

const decode = (text: string, keepNewlines = false) =>
  text
    .replace(/<sup>2<\/sup>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(keepNewlines ? /[^\S\n]+/g : /\s+/g, " ")
    .trim();

/** Two or three capitalised words, no digits — a person's name, probably. */
const looksLikePerson = (line: string) =>
  /^[A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’.-]+){1,2}$/.test(line) && line.length < 40;

const looksLikeOrg = (line: string) =>
  /\b(LLC|Inc|Realty|Properties|Property|Management|Apartments?|Finders|Group|Partners|Homes|Leasing|Rentals?)\b/i.test(
    line,
  ) && line.length < 60;

/**
 * Pulls the contact off a "Contact:" block.
 *
 * Only reads a name the poster chose to publish. Nothing here infers a name
 * from an address or a phone number - a person who never put their name in the
 * post has not agreed to be looked up, and a fuzzed map pin would finger the
 * wrong household entirely.
 */
function extractContact(lines: string[]): {
  contactName: string | null;
  contactOrg: string | null;
} {
  for (let i = 0; i < lines.length; i += 1) {
    const inline = lines[i].match(/^contact(?:\s*name)?\s*:\s*(.+)$/i);
    const bare = /^contact(?:\s*name)?\s*:?\s*$/i.test(lines[i]);
    if (!inline && !bare) continue;

    // "Contact: Norice Taylor" on one line, or "Contact:" then the name below.
    const candidates = inline
      ? [inline[1].trim(), ...lines.slice(i + 1, i + 3)]
      : lines.slice(i + 1, i + 4);

    const name = candidates.find(looksLikePerson) ?? null;
    const org = candidates.find((line) => line !== name && looksLikeOrg(line)) ?? null;
    if (name || org) return { contactName: name, contactOrg: org };
  }
  return { contactName: null, contactOrg: null };
}

/** Digits only, dropping a leading US country code. */
const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
};

export async function parseListing(url: string): Promise<ParsedListing> {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Craigslist returned ${response.status}`);
  }
  const html = await response.text();

  const rawTitle = first(html, /<title>([^<]+)<\/title>/);
  // "Furnished One Bedroom ... - apts/housing for rent - apartment rent - craigslist"
  const title = rawTitle ? rawTitle.split(" - ")[0].trim() : null;

  const priceText = first(html, /class="price"[^>]*>([^<]+)</);
  const price = priceText ? Number(priceText.replace(/[^0-9]/g, "")) || null : null;

  const lat = first(html, /data-latitude="([^"]+)"/);
  const lng = first(html, /data-longitude="([^"]+)"/);

  // "1BR / 1Ba" in the first attrgroup.
  const beds = first(html, /(\d+(?:\.\d+)?)\s*BR/i);
  const baths = first(html, /(\d+(?:\.\d+)?)\s*Ba\b/i);
  const sqft = first(html, /(\d[\d,]*)\s*ft<sup>2<\/sup>/i);

  // Craigslist gives the application fee its own attribute rather than
  // burying it in the body, so it is reliable when present.
  const feeBlock = html.match(
    /class="attr application_fee_explained"[\s\S]{0,300}?<\/div>/,
  );
  const applicationFee = feeBlock
    ? decode(feeBlock[0]).replace(/^.*application fee details:\s*/i, "").trim() || null
    : null;

  const bodyBlock = html.match(/id="postingbody"[\s\S]*?<\/section>/);
  let body: string | null = null;
  let bodyLines: string[] = [];
  if (bodyBlock) {
    const cleaned = bodyBlock[0]
      // The QR block is Craigslist chrome, not the poster's words.
      .replace(/<div class="print-information[\s\S]*?<\/div>\s*<\/div>/, "")
      .replace(/^id="postingbody">/, "");
    body = decode(cleaned);
    // Posters put the contact on its own <br>-separated line, so the line
    // breaks have to survive long enough to read it. `body` stays collapsed.
    bodyLines = decode(cleaned.replace(/<br\s*\/?>/gi, "\n"), true)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const { contactName, contactOrg } = extractContact(bodyLines);

  // Photos come in several sizes; one entry per image id is enough.
  const photoIds = new Set<string>();
  const photos: string[] = [];
  for (const match of html.matchAll(
    /https:\/\/images\.craigslist\.org\/([A-Za-z0-9_]+)_\d+x\d+\.jpg/g,
  )) {
    if (photoIds.has(match[1])) continue;
    photoIds.add(match[1]);
    photos.push(match[0]);
  }

  const haystack = `${body ?? ""} ${title ?? ""}`;
  const bodyPhones = [
    ...new Set(
      (haystack.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) ?? [])
        .map(normalizePhone)
        .filter((d) => d.length === 10),
    ),
  ];
  const bodyEmails = [
    ...new Set(haystack.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? []),
  ];

  return {
    url,
    title,
    price,
    bedrooms: beds ? Number(beds) : null,
    bathrooms: baths ? Number(baths) : null,
    sqft: sqft ? Number(sqft.replace(/,/g, "")) : null,
    applicationFee,
    pin: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
    mapAddress: first(html, /class="mapaddress"[^>]*>([^<]+)</),
    body,
    postedAt: first(html, /<time[^>]*datetime="([^"]+)"/),
    photos,
    bodyPhones,
    bodyEmails,
    contactName,
    contactOrg,
  };
}
