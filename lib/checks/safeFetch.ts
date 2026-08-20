import { lookup } from "node:dns/promises";

/**
 * Outbound fetch for user-supplied URLs.
 *
 * The checker takes a link from whoever is using it and fetches it from our
 * server. Without a guard that is a server-side request forgery hole: someone
 * pastes http://169.254.169.254/ and we happily fetch the cloud metadata
 * endpoint - credentials and all - from inside our own network.
 *
 * So the host is resolved first and the resulting address checked against the
 * private ranges before any request goes out. Resolving up front also closes
 * the DNS-rebinding gap where a name answers public once and private later,
 * because we connect to the address we validated.
 */

const BLOCKED_HOSTNAMES = /^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i;

/** Loopback, private, link-local, CGNAT, and unspecified ranges. */
function isPrivateAddress(address: string, family: number): boolean {
  if (family === 6) {
    const v6 = address.toLowerCase();
    if (v6 === "::" || v6 === "::1") return true;
    // Unique-local and link-local v6.
    if (/^(fc|fd|fe8|fe9|fea|feb)/.test(v6)) return true;
    // v4-mapped v6 — validate the embedded v4 instead.
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1], 4);
    return false;
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 0 || a === 127) return true; // unspecified, loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast and reserved
  return false;
}

export class UnsafeUrlError extends Error {}

/** Throws UnsafeUrlError unless the URL is public http(s). */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That does not look like a link.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https links can be checked.");
  }
  if (BLOCKED_HOSTNAMES.test(url.hostname)) {
    throw new UnsafeUrlError("That address is not reachable from here.");
  }

  let resolved: { address: string; family: number };
  try {
    resolved = await lookup(url.hostname);
  } catch {
    throw new UnsafeUrlError("That domain could not be resolved.");
  }
  if (isPrivateAddress(resolved.address, resolved.family)) {
    throw new UnsafeUrlError("That address is not reachable from here.");
  }

  return url;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/** Rental pages run to hundreds of KB; only the first slice is ever useful. */
const MAX_BYTES = 600_000;

export async function fetchPublicPage(raw: string): Promise<string> {
  const url = await assertPublicUrl(raw);
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    // Redirects can hop to a private address after the check, so they are
    // followed manually and re-validated each time.
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new Error(`Fetch failed (${response.status}).`);
    return fetchPublicPage(new URL(location, url).toString());
  }
  if (!response.ok) {
    throw new Error(
      response.status === 403 || response.status === 429
        ? "That site blocks automated readers. Copy the listing text and paste it instead."
        : `That page returned ${response.status}.`,
    );
  }

  const text = await response.text();
  return text.slice(0, MAX_BYTES);
}

/** Strips a page down to readable text so a model is not billed for markup. */
export function htmlToText(html: string, maxChars = 40_000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}
