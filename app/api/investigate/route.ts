import { NextResponse } from "next/server";
import { investigate, type InvestigationInput } from "@/lib/checks/investigate";
import { toMapListing } from "@/lib/checks/toMapListing";
import {
  assertPublicUrl,
  MAX_LISTING_CHARS,
  UnsafeUrlError,
} from "@/lib/checks/safeFetch";
import { claudeConfigured } from "@/lib/checks/parseWithClaude";
import { listingBySourceUrl, saveInvestigation } from "@/lib/db/listings";

/**
 * Enough text to be a listing, capped so nobody can paste a novel.
 *
 * The upper bound is shared with the fetched-page path rather than restated,
 * because it is really one number: the most this endpoint will ever pay a model
 * to read in a single request. This route is public and unauthenticated, so
 * that number is the whole exposure.
 */
const MIN_TEXT = 40;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const { url, text, force } = (body ?? {}) as {
    url?: unknown;
    text?: unknown;
    force?: unknown;
  };
  let input: InvestigationInput;

  if (typeof text === "string" && text.trim() !== "") {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT) {
      return NextResponse.json(
        { error: "That is too short to read as a listing. Paste the whole post." },
        { status: 400 },
      );
    }
    if (!claudeConfigured()) {
      return NextResponse.json(
        { error: "Reading pasted text needs ANTHROPIC_API_KEY in .env.local." },
        { status: 400 },
      );
    }
    input = { kind: "text", text: trimmed.slice(0, MAX_LISTING_CHARS) };
  } else if (typeof url === "string" && url.trim() !== "") {
    try {
      // Resolves the host and rejects private addresses before any fetch.
      const safe = await assertPublicUrl(url.trim());
      input = { kind: "url", url: safe.toString() };
    } catch (error) {
      const message =
        error instanceof UnsafeUrlError
          ? error.message
          : "That does not look like a link.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      { error: "Paste a listing link, or the listing text." },
      { status: 400 },
    );
  }

  // Someone already did this work. Hand over what they found rather than
  // re-fetching the post, re-hitting four public records, and on a
  // non-Craigslist listing spending a model call to learn the same thing.
  // Pasted text has no stable URL to look up, so it always runs fresh.
  if (input.kind === "url" && force !== true) {
    const existing = await listingBySourceUrl(input.url);
    if (existing?.investigation) {
      return NextResponse.json({
        url: input.url,
        fromStore: true,
        checkedAt: existing.investigation.checkedAt,
        readBy: existing.investigation.readBy,
        listing: existing.investigation.parsed,
        findings: existing.investigation.findings,
        mapListing: existing,
      });
    }
  }

  try {
    const result = await investigate(input);
    const mapListing = toMapListing(result);

    // Persisting is best-effort: a database that is down or unconfigured
    // should cost the shared map, not the answer the student is waiting for.
    let stored = null;
    if (mapListing) {
      stored = await saveInvestigation(mapListing, {
        checkedAt: result.checkedAt,
        readBy: result.readBy,
        findings: result.findings,
        parsed: result.listing,
      });
    }

    return NextResponse.json({
      ...result,
      fromStore: false,
      mapListing: stored ?? mapListing,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The check failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
