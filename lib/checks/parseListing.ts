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

const decode = (text: string) =>
  text
    .replace(/<sup>2<\/sup>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

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

  const bodyBlock = html.match(/id="postingbody"[\s\S]*?<\/section>/);
  let body: string | null = null;
  if (bodyBlock) {
    body = decode(
      bodyBlock[0]
        // The QR block is Craigslist chrome, not the poster's words.
        .replace(/<div class="print-information[\s\S]*?<\/div>\s*<\/div>/, "")
        .replace(/^id="postingbody">/, ""),
    );
  }

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
    pin: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null,
    mapAddress: first(html, /class="mapaddress"[^>]*>([^<]+)</),
    body,
    postedAt: first(html, /<time[^>]*datetime="([^"]+)"/),
    photos,
    bodyPhones,
    bodyEmails,
  };
}
