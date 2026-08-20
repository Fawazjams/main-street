import { NextResponse } from "next/server";
import { allListings } from "@/lib/db/listings";
import { dbConfigured } from "@/lib/db/client";

/**
 * Every listing on the shared map, with the findings attached.
 *
 * Returns `configured: false` rather than an error when Supabase is not set up,
 * so the page can fall back to the seed listings and still demo.
 */
export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ configured: false, listings: [] });
  }

  try {
    return NextResponse.json({ configured: true, listings: await allListings() });
  } catch {
    return NextResponse.json({ configured: true, listings: [], error: "Could not read listings." });
  }
}
