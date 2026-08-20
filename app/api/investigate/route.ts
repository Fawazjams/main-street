import { NextResponse } from "next/server";
import { investigate, type InvestigationInput } from "@/lib/checks/investigate";
import { toMapListing } from "@/lib/checks/toMapListing";
import { assertPublicUrl, UnsafeUrlError } from "@/lib/checks/safeFetch";
import { claudeConfigured } from "@/lib/checks/parseWithClaude";

/** Enough text to be a listing, capped so nobody can paste a novel. */
const MIN_TEXT = 40;
const MAX_TEXT = 40_000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const { url, text } = (body ?? {}) as { url?: unknown; text?: unknown };
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
    input = { kind: "text", text: trimmed.slice(0, MAX_TEXT) };
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

  try {
    const result = await investigate(input);
    return NextResponse.json({ ...result, mapListing: toMapListing(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The check failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
