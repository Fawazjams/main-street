"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Finding, FindingState, ParsedListing } from "@/lib/checks/types";
import type { Listing } from "@/lib/types";

interface InvestigationResponse {
  url: string;
  listing: ParsedListing;
  findings: Finding[];
  mapListing: Listing | null;
}

const STATE_LABEL: Record<FindingState, string> = {
  found: "Checked",
  "not-found": "No record",
  skipped: "Not run",
  error: "Failed",
};

// Deliberately one neutral treatment for every state. Colouring "found" green
// would turn a lookup that merely succeeded into a reassurance.
const CHIP = "rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-600";

interface BackgroundCheckerProps {
  onAddToMap: (listing: Listing) => void;
  verifiedUrls: string[];
}

export function BackgroundChecker({ onAddToMap, verifiedUrls }: BackgroundCheckerProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResponse | null>(null);

  const mapListing = result?.mapListing ?? null;
  const added = mapListing !== null && verifiedUrls.includes(mapListing.sourceUrl);

  async function runCheck() {
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

    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
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
          Paste a Craigslist link. We look up what we can independently and show it next to
          what the post claims. We do not score listings — the disagreements are the point.
        </p>

        <div className="mt-5 flex gap-2">
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
              Checked listings get added to the map, so the next student searching your campus
              sees what you found.
            </p>
          </div>
        )}

        {result && listing && !loading && (
          <div className="mt-8 space-y-4">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-medium text-neutral-900">What the post says</h3>
              <p className="mt-1 text-sm text-neutral-700">{listing.title}</p>
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {[
                  ["Asking rent", listing.price ? `$${listing.price.toLocaleString()}/mo` : "—"],
                  [
                    "Layout",
                    [
                      listing.bedrooms ? `${listing.bedrooms} bd` : null,
                      listing.bathrooms ? `${listing.bathrooms} ba` : null,
                      listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—",
                  ],
                  ["Address given", listing.mapAddress ?? "None published"],
                  [
                    "Posted",
                    listing.postedAt
                      ? new Date(listing.postedAt).toLocaleDateString()
                      : "—",
                  ],
                  ["Photos", String(listing.photos.length)],
                  [
                    "Contacts in body",
                    listing.bodyPhones.length + listing.bodyEmails.length > 0
                      ? [...listing.bodyPhones, ...listing.bodyEmails].join(", ")
                      : "None — replies go through Craigslist",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 text-xs">
                    <dt className="shrink-0 text-neutral-500">{label}</dt>
                    <dd className="truncate text-right text-neutral-900" title={value}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {result.findings.map((finding) => (
              <div key={finding.id} className="rounded-lg border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-neutral-900">{finding.label}</h3>
                  <span className={CHIP}>{STATE_LABEL[finding.state]}</span>
                </div>

                {finding.claim && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded border border-neutral-100 bg-neutral-50 p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                        The post says
                      </p>
                      <p className="mt-1 text-xs text-neutral-900">{finding.claim}</p>
                    </div>
                    <div className="rounded border border-neutral-100 bg-neutral-50 p-2.5">
                      <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                        {finding.foundLabel ?? "Records say"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-900">{finding.found ?? "—"}</p>
                    </div>
                  </div>
                )}

                {finding.note && (
                  <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-neutral-700">
                    {finding.note}
                  </p>
                )}
                {finding.reason && (
                  <p className="mt-2 text-sm text-neutral-500">{finding.reason}</p>
                )}
                {finding.source && (
                  <p className="mt-3 border-t border-neutral-100 pt-2 text-[11px] text-neutral-500">
                    Source:{" "}
                    {finding.source.url ? (
                      <a
                        href={finding.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {finding.source.label}
                      </a>
                    ) : (
                      finding.source.label
                    )}
                  </p>
                )}
              </div>
            ))}

            {mapListing && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {mapListing.title}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-600">
                    ${mapListing.bodyPrice.toLocaleString()}/mo · {mapListing.bedrooms} bd
                    {mapListing.coords ? "" : " · no location to pin"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={added}
                  onClick={() => onAddToMap(mapListing)}
                >
                  {added ? "On the map" : "Add to map"}
                </Button>
              </div>
            )}

            <p className={cn("pt-2 text-xs text-neutral-500")}>
              Every check above is a public-records lookup with no paid provider behind it.
              Photo matching and identifying who is behind a phone number both need paid APIs
              and are not wired up.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
