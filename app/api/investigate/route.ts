import { NextResponse } from "next/server";
import {
  investigate,
  isCraigslist,
  type InvestigationInput,
} from "@/lib/checks/investigate";
import { toMapListing } from "@/lib/checks/toMapListing";
import {
  assertPublicUrl,
  MAX_LISTING_CHARS,
  UnsafeUrlError,
} from "@/lib/checks/safeFetch";
import { claudeConfigured } from "@/lib/checks/parseWithClaude";
import { listingBySourceUrl, saveInvestigation } from "@/lib/db/listings";
import { bucket, callerKey, take } from "@/lib/rateLimit";

/**
 * Enough text to be a listing, capped so nobody can paste a novel.
 *
 * The upper bound is shared with the fetched-page path rather than restated,
 * because it is really one number: the most this endpoint will ever pay a model
 * to read in a single request. This route is public and unauthenticated, so
 * that number is the whole exposure.
 */
const MIN_TEXT = 40;

/**
 * Two allowances, because the two kinds of request cost wildly different money.
 *
 * A Craigslist link is parsed by regex and, once anyone has checked it, served
 * straight from the store - free, and exactly what a judge clicking around the
 * demo does, so it gets a generous allowance. Reading anything else needs a
 * model call, which is the only thing here that spends, so it gets a tight one.
 *
 * Rate limiting the free path as hard as the paid one would degrade the demo to
 * protect nothing.
 */
const ALL_REQUESTS = bucket(30, 10 * 60_000);
const MODEL_REQUESTS = bucket(5, 10 * 60_000);

const tooMany = (retryAfter: number) =>
  NextResponse.json(
    { error: "That is a lot of checks at once. Give it a few minutes." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );

/**
 * `force` re-runs a check that has already been stored.
 *
 * Not something a visitor gets to ask for. The findings it would re-fetch are
 * free, but they come from Travis County, HUD, the Census and TREC, and making
 * them re-answer the same question from one Vercel IP on demand is how you get
 * that IP blocked - which would break the checker for everyone, quietly, and
 * for nothing gained.
 *
 * Kept usable for us via a shared secret. When RECHECK_SECRET is unset - which
 * is the default, and the case in every deployment until somebody sets it -
 * force is never honoured at all.
 */
function forceAllowed(request: Request): boolean {
  const secret = process.env.RECHECK_SECRET;
  if (!secret) return false;
  return request.headers.get("x-recheck-secret") === secret;
}

export async function POST(request: Request) {
  const caller = callerKey(request);
  const overall = take(ALL_REQUESTS, caller);
  if (!overall.allowed) return tooMany(overall.retryAfter);

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
    // Pasted text has no URL to look up, so it can never be served from the
    // store and always reaches the model. Charge the tight allowance here.
    const paid = take(MODEL_REQUESTS, caller);
    if (!paid.allowed) return tooMany(paid.retryAfter);
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
  if (input.kind === "url" && !(force === true && forceAllowed(request))) {
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

  if (input.kind === "url" && !isCraigslist(input.url)) {
    // Nothing stored, and no free parser for this host, so the next step is a
    // model call. Same allowance as pasted text, for the same reason.
    const paid = take(MODEL_REQUESTS, caller);
    if (!paid.allowed) return tooMany(paid.retryAfter);
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
