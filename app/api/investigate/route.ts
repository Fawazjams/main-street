import { NextResponse } from "next/server";
import { investigate } from "@/lib/checks/investigate";
import { toMapListing } from "@/lib/checks/toMapListing";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const url = (body as { url?: unknown })?.url;
  if (typeof url !== "string" || url.trim() === "") {
    return NextResponse.json({ error: "Paste a listing link to check." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json(
      { error: "That does not look like a link. Paste the full URL." },
      { status: 400 },
    );
  }
  // Only outbound fetches to Craigslist. Without this the endpoint would fetch
  // any URL a caller supplies, on our network, from our address.
  if (!/(^|\.)craigslist\.org$/i.test(parsed.hostname)) {
    return NextResponse.json(
      { error: "This checker only handles craigslist.org listings." },
      { status: 400 },
    );
  }

  try {
    const result = await investigate(parsed.toString());
    return NextResponse.json({ ...result, mapListing: toMapListing(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The check failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
