"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FmrLadder } from "@/components/checks/FmrLadder";
import { PinMap } from "@/components/checks/PinMap";
import { PhotoStrip } from "@/components/PhotoStrip";
import { cn } from "@/lib/utils";
import type { Finding, FindingState, ParsedListing } from "@/lib/checks/types";
import type { Listing } from "@/lib/types";

interface InvestigationResponse {
  url: string;
  listing: ParsedListing;
  findings: Finding[];
  mapListing: Listing | null;
  readBy: "craigslist-parser" | "claude";
}

type Mode = "url" | "text";

const STATE_LABEL: Record<FindingState, string> = {
  found: "Checked",
  "not-found": "No record",
  skipped: "Not run",
  error: "Failed",
};

// One neutral treatment for every state. Colouring "found" green would turn a
// lookup that merely succeeded into a reassurance.
const CHIP =
  "shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-600";

const SECTION_LABEL =
  "text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400";

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-800">
      {children}
    </span>
  );
}

interface BackgroundCheckerProps {
  onAddToMap: (listing: Listing) => void;
  verifiedUrls: string[];
}

export function BackgroundChecker({ onAddToMap, verifiedUrls }: BackgroundCheckerProps) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvestigationResponse | null>(null);

  const mapListing = result?.mapListing ?? null;
  const added = mapListing !== null && verifiedUrls.includes(mapListing.sourceUrl);

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
              Checked listings get added to the map, so the next student searching your campus
              sees what you found.
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

            <div className="mt-8 space-y-8">
              {result.findings.map((finding) => (
                <section key={finding.id}>
                  <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-2">
                    <h4 className={SECTION_LABEL}>{finding.label}</h4>
                    <span className={CHIP}>{STATE_LABEL[finding.state]}</span>
                  </div>

                  {finding.claim && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className={SECTION_LABEL}>The post says</p>
                        <p className="mt-1 text-sm text-neutral-900">{finding.claim}</p>
                      </div>
                      <div>
                        <p className={SECTION_LABEL}>{finding.foundLabel ?? "Records say"}</p>
                        <p className="mt-1 text-sm text-neutral-900">{finding.found ?? "—"}</p>
                      </div>
                    </div>
                  )}

                  {finding.data?.kind === "fmr-ladder" && (
                    <FmrLadder
                      bars={finding.data.bars}
                      listingPrice={finding.data.listingPrice}
                      area={finding.data.area}
                      year={finding.data.year}
                    />
                  )}
                  {finding.data?.kind === "pin-map" && (
                    <PinMap
                      pin={finding.data.pin}
                      geocoded={finding.data.geocoded}
                      miles={finding.data.miles}
                      address={finding.data.address}
                    />
                  )}

                  {finding.note && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-800">
                      {finding.note}
                    </p>
                  )}
                  {finding.reason && (
                    <p className="mt-3 text-sm text-neutral-500">{finding.reason}</p>
                  )}

                  {finding.why && (
                    <details className="group mt-3">
                      <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400 hover:text-neutral-700">
                        <span className="inline-block transition-transform group-open:rotate-90">
                          ›
                        </span>{" "}
                        Why this matters
                      </summary>
                      <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-sm leading-relaxed text-neutral-600">
                        {finding.why}
                      </p>
                    </details>
                  )}

                  {finding.source && (
                    <p className="mt-3 text-[11px] text-neutral-400">
                      Source:{" "}
                      {finding.source.url ? (
                        <a
                          href={finding.source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2 hover:text-neutral-700"
                        >
                          {finding.source.label}
                        </a>
                      ) : (
                        finding.source.label
                      )}
                    </p>
                  )}
                </section>
              ))}
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
                <Button variant="outline" disabled={added} onClick={() => onAddToMap(mapListing)}>
                  {added ? "On the map" : "Add to map"}
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
