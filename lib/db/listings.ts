import { db } from "./client";
import type { Listing } from "@/lib/types";
import type { Finding, ParsedListing } from "@/lib/checks/types";

/**
 * Listings and what was found about them.
 *
 * The two are separate tables on purpose. A listing is a place; an
 * investigation is what someone learned about it on a given day. Keeping the
 * findings attached is the whole point of the shared map — without them the
 * second student inherits a "Checked" badge and none of the evidence behind it.
 */

export interface StoredInvestigation {
  checkedAt: string;
  readBy: string;
  findings: Finding[];
  parsed: ParsedListing | null;
}

export interface StoredListing extends Listing {
  /** Latest investigation, when the listing has been checked. */
  investigation: StoredInvestigation | null;
}

interface ListingRow {
  id: string;
  source_url: string;
  title: string | null;
  body_price: number | null;
  title_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  address: string | null;
  address_status: string;
  lng: number | null;
  lat: number | null;
  photos: string[] | null;
  verified: boolean;
}

interface InvestigationRow {
  listing_id: string;
  checked_at: string;
  read_by: string;
  findings: Finding[];
  parsed: ParsedListing | null;
}

const toListing = (row: ListingRow, investigation: StoredInvestigation | null): StoredListing => ({
  id: row.id,
  title: row.title ?? "Listing",
  bodyPrice: row.body_price ?? 0,
  titlePrice: row.title_price ?? undefined,
  bedrooms: Number(row.bedrooms ?? 1),
  bathrooms: Number(row.bathrooms ?? 1),
  address: row.address,
  addressStatus: row.address_status === "on-request" ? "on-request" : "published",
  coords: row.lng !== null && row.lat !== null ? [row.lng, row.lat] : null,
  photos: row.photos ?? [],
  sourceUrl: row.source_url,
  verified: row.verified,
  investigation,
});

/** Every listing on the map, newest first, each with its latest findings. */
export async function allListings(): Promise<StoredListing[]> {
  const client = db();
  if (!client) return [];

  const { data: rows, error } = await client
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !rows) return [];

  const ids = rows.map((row: ListingRow) => row.id);
  const latest = new Map<string, StoredInvestigation>();

  if (ids.length > 0) {
    const { data: found } = await client
      .from("investigations")
      .select("listing_id, checked_at, read_by, findings, parsed")
      .in("listing_id", ids)
      .order("checked_at", { ascending: false });

    // Ordered newest first, so the first row seen per listing is the current one.
    for (const row of (found ?? []) as InvestigationRow[]) {
      if (latest.has(row.listing_id)) continue;
      latest.set(row.listing_id, {
        checkedAt: row.checked_at,
        readBy: row.read_by,
        findings: row.findings ?? [],
        parsed: row.parsed,
      });
    }
  }

  return (rows as ListingRow[]).map((row) => toListing(row, latest.get(row.id) ?? null));
}

/** One listing and its latest findings, by id. */
export async function listingById(id: string): Promise<StoredListing | null> {
  const client = db();
  if (!client) return null;

  const { data: row } = await client.from("listings").select("*").eq("id", id).maybeSingle();
  if (!row) return null;

  const { data: found } = await client
    .from("investigations")
    .select("listing_id, checked_at, read_by, findings, parsed")
    .eq("listing_id", id)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const investigation = found
    ? {
        checkedAt: (found as InvestigationRow).checked_at,
        readBy: (found as InvestigationRow).read_by,
        findings: (found as InvestigationRow).findings ?? [],
        parsed: (found as InvestigationRow).parsed,
      }
    : null;

  return toListing(row as ListingRow, investigation);
}

/** A previously checked listing, looked up by where it came from. */
export async function listingBySourceUrl(sourceUrl: string): Promise<StoredListing | null> {
  const client = db();
  if (!client) return null;

  const { data: row } = await client
    .from("listings")
    .select("id")
    .eq("source_url", sourceUrl)
    .maybeSingle();
  return row ? listingById((row as { id: string }).id) : null;
}

/**
 * Writes a listing and the findings that go with it.
 *
 * Upserts on source_url so re-checking a place updates it rather than dropping
 * a second pin, and appends a new investigation row rather than replacing the
 * old one — the history of what a listing looked like over time is exactly what
 * makes fee churning visible later.
 */
export async function saveInvestigation(
  listing: Listing,
  investigation: Omit<StoredInvestigation, "readBy"> & { readBy: string },
): Promise<StoredListing | null> {
  const client = db();
  if (!client) return null;

  const { data: saved, error } = await client
    .from("listings")
    .upsert(
      {
        source_url: listing.sourceUrl,
        title: listing.title,
        body_price: listing.bodyPrice,
        title_price: listing.titlePrice ?? null,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        address: listing.address,
        address_status: listing.addressStatus,
        lng: listing.coords?.[0] ?? null,
        lat: listing.coords?.[1] ?? null,
        photos: listing.photos,
        verified: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_url" },
    )
    .select("id")
    .single();

  if (error || !saved) return null;
  const listingId = (saved as { id: string }).id;

  await client.from("investigations").insert({
    listing_id: listingId,
    checked_at: investigation.checkedAt,
    read_by: investigation.readBy,
    findings: investigation.findings,
    parsed: investigation.parsed,
  });

  return listingById(listingId);
}
