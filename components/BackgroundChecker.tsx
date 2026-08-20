"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoStrip } from "@/components/PhotoStrip";
import { FindingList } from "@/components/FindingList";
import { cn } from "@/lib/utils";
import type { Finding, ParsedListing } from "@/lib/checks/types";
import type { Listing } from "@/lib/types";

interface InvestigationResponse {
  url: string;
  listing: ParsedListing;
  findings: Finding[];
  mapListing: Listing | null;
  /** True when these findings came from the shared store, not a fresh run. */
  fromStore?: boolean;
  checkedAt?: string;
  readBy: "craigslist-parser" | "claude";
}

type Mode = "url" | "text";

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-800">
      {children}
    </span>
  );
}

interface BackgroundCheckerProps {
  onShowOnMap: (listing: Listing) => void;
}

export function BackgroundChecker({ onShowOnMap }: BackgroundCheckerProps) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResponse | null>(null);

  const mapListing = result?.mapListing ?? null;

  async function runCheck() {
    let payload: { url?: string; text?: string };

    if (mode === "url") {
      const trimmed = url.trim();
      if (trimmed === "") {
        setError("Paste a listing link first.");
        return;
      }
      try {
        new URL(trimmed);
      } catch {
        setError("That does not look like a link. Include the full URL.");
        return;
      }
      payload = { url: trimmed };
    } else {
      const trimmed = text.trim();
      if (trimmed.length < 40) {
        setError("Paste the whole listing — that is too short to read.");
        return;
      }
      payload = { text: trimmed };
    }

    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "The check failed. Try again.");
        return;
      }
      setResult(data as InvestigationResponse);
    } catch {
      setError("Could not reach the checker. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const listing = result?.listing;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <h2 className="text-lg font-medium text-neutral-900">Check a listing</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Paste a link, or the listing text if the site blocks us. We look up what we can independently and show it next to
          what the post claims. We do not score listings — the disagreements are the point.
        </p>

        <div className="mt-5 flex gap-4 border-b border-neutral-200">
          {(
            [
              ["url", "Paste a link"],
              ["text", "Paste the listing text"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              aria-pressed={mode === value}
              className={cn(
                "-mb-px border-b-2 pb-2 text-sm transition-colors",
                mode === value
                  ? "border-neutral-900 font-medium text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "url" ? (
          <div className="mt-4 flex gap-2">
            <Input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loading) runCheck();
              }}
              placeholder="https://www.craigslist.org/view/d/..."
              aria-label="Listing URL"
              aria-invalid={error !== null}
              disabled={loading}
            />
            <Button onClick={runCheck} disabled={loading}>
              {loading ? "Checking…" : "Check listing"}
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Copy the whole post — rent, address, description, contact — and paste it here."
              aria-label="Listing text"
              aria-invalid={error !== null}
              disabled={loading}
              rows={7}
              className="w-full rounded-md border border-neutral-200 bg-white p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:outline-none disabled:opacity-60"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                For sites that block automated readers — Zillow, Facebook Marketplace,
                Apartments.com.
              </p>
              <Button onClick={runCheck} disabled={loading}>
                {loading ? "Checking…" : "Check listing"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

        {loading && (
          <div className="mt-8 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-neutral-200 p-4">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="mt-10 rounded-lg border border-dashed border-neutral-300 px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900">Nothing checked yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-600">
              Whatever you check is saved to the shared map, so the next student searching
              your campus reads what you found instead of paying to find it again.
            </p>
          </div>
        )}

        {result && listing && !loading && (
          <div className="mt-8">
            <section>
              <h3 className="text-base font-medium leading-snug text-neutral-900">
                {listing.title}
              </h3>
              {listing.url ? (
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                >
                  {listing.url}
                </a>
              ) : (
                <p className="mt-1 text-xs text-neutral-500">Read from pasted text</p>
              )}

              {listing.photos.length > 0 && (
                <div className="mt-3">
                  <PhotoStrip photos={listing.photos} title={listing.title} />
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {listing.price !== null && <Fact>${listing.price.toLocaleString()}/mo</Fact>}
                {listing.bedrooms !== null && <Fact>{listing.bedrooms}BR</Fact>}
                {listing.bathrooms !== null && <Fact>{listing.bathrooms}BA</Fact>}
                {listing.sqft !== null && <Fact>{listing.sqft.toLocaleString()} sqft</Fact>}
                {listing.applicationFee && <Fact>{listing.applicationFee} app fee</Fact>}
                <Fact>{listing.photos.length} photos</Fact>
              </div>

              <p className="mt-2.5 text-xs text-neutral-500">
                {listing.mapAddress ?? "No address published"}
                {listing.postedAt &&
                  ` · posted ${new Date(listing.postedAt).toLocaleDateString()}`}
                {listing.bodyPhones.length + listing.bodyEmails.length > 0
                  ? ` · ${[...listing.bodyPhones, ...listing.bodyEmails].join(", ")}`
                  : " · no contact in the post, replies go through Craigslist"}
              </p>
            </section>

            {result.fromStore && (
              <div className="mt-8 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3">
                <p className="text-sm text-orange-900">
                  Another student already checked this one
                  {result.checkedAt
                    ? ` on ${new Date(result.checkedAt).toLocaleDateString()}`
                    : ""}
                  . These are their findings — nothing was re-run, and nothing was spent.
                </p>
              </div>
            )}

            <div className="mt-8">
              <FindingList findings={result.findings} />
            </div>

            {mapListing && (
              <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {mapListing.title}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    ${mapListing.bodyPrice.toLocaleString()}/mo · {mapListing.bedrooms} bd
                    {mapListing.coords ? "" : " · no location to pin"}
                  </p>
                </div>
                <Button variant="outline" onClick={() => onShowOnMap(mapListing)}>
                  View on map
                </Button>
              </div>
            )}

            <p className={cn("mt-4 text-xs text-neutral-500")}>
              {result.readBy === "claude" && (
                <>
                  The listing details were read by a language model rather than a parser,
                  so check them against the original before relying on them. Every finding
                  below that is a public-records lookup against those details.{" "}
                </>
              )}
              The checks themselves use no paid provider. Photo matching, identifying who
              is behind a phone number, and recovering Craigslist&apos;s gated contact all
              need paid APIs and are not wired up.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
