"use client";

import { useState } from "react";
import {
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  TextAlignLeftIcon,
} from "@phosphor-icons/react/ssr";
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

/**
 * One fact the post published, as a chip.
 *
 * The colour is fixed per field, never per value - the rent chip is the same
 * colour whether the rent is $500 or $5,000. It separates one fact from the
 * next and says nothing about any of them.
 */
function Fact({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", tone)}
    >
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
    <div className="h-full overflow-y-auto bg-cream">
      <div className="mx-auto w-full max-w-[680px] px-6 py-10">
        <h2 className="font-heading text-[21px] font-semibold text-ink">
          Check a listing
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Paste a link, or the listing text if the site blocks us. We look up what we can
          independently and show it next to what the post claims. We do not score listings
          — the disagreements are the point.
        </p>

        <div className="mt-5 flex gap-4 border-b border-line">
          {(
            [
              ["url", "Paste a link", LinkSimpleIcon],
              ["text", "Paste the listing text", TextAlignLeftIcon],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              aria-pressed={mode === value}
              className={cn(
                "-mb-px border-b-2 pb-2.5 text-[13px] transition-colors",
                mode === value
                  ? "border-green font-semibold text-ink"
                  : "border-transparent text-muted-ink hover:text-ink",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon size={15} aria-hidden />
                {label}
              </span>
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
            <Button size="pill" className="uppercase" onClick={runCheck} disabled={loading}>
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
              className="w-full rounded-md border border-line bg-panel p-3 text-sm text-ink placeholder:text-faint focus-visible:border-green focus-visible:outline-none disabled:opacity-60"
            />
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <p className="text-xs text-faint">
                For sites that block automated readers — Zillow, Facebook Marketplace,
                Apartments.com.
              </p>
              <Button
                size="pill"
                className="uppercase"
                onClick={runCheck}
                disabled={loading}
              >
                {loading ? "Checking…" : "Check listing"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="mt-2.5 text-sm text-alert">{error}</p>}

        {loading && (
          <div className="mt-8 space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-line bg-panel p-4">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="mt-9 rounded-2xl border border-dashed border-line-strong bg-soft px-6 py-9 text-center">
            <MagnifyingGlassIcon
              size={28}
              className="mx-auto mb-3 text-line-strong"
              aria-hidden
            />
            <p className="font-heading text-[15px] font-semibold text-ink">
              Nothing checked yet
            </p>
            <p className="mx-auto mt-1.5 max-w-[360px] text-[13px] leading-relaxed text-body">
              Whatever you check is saved to the shared map, so the next student searching
              your campus reads what you found instead of paying to find it again.
            </p>
          </div>
        )}

        {result && listing && !loading && (
          <div className="mt-8">
            <section>
              <h3 className="font-heading text-lg leading-snug font-semibold text-ink">
                {listing.title}
              </h3>
              {listing.url ? (
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-xs text-faint underline underline-offset-2 hover:text-body"
                >
                  {listing.url}
                </a>
              ) : (
                <p className="mt-1 text-xs text-faint">Read from pasted text</p>
              )}

              {listing.photos.length > 0 && (
                <div className="mt-3">
                  <PhotoStrip photos={listing.photos} title={listing.title} />
                </div>
              )}

              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {listing.price !== null && (
                  <Fact tone="bg-blush text-ink">
                    ${listing.price.toLocaleString()}/mo
                  </Fact>
                )}
                {listing.bedrooms !== null && (
                  <Fact tone="bg-green text-cream">{listing.bedrooms}BR</Fact>
                )}
                {listing.bathrooms !== null && (
                  <Fact tone="bg-gold text-ink">{listing.bathrooms}BA</Fact>
                )}
                {listing.sqft !== null && (
                  <Fact tone="bg-fill text-ink">
                    {listing.sqft.toLocaleString()} sqft
                  </Fact>
                )}
                {listing.applicationFee && (
                  <Fact tone="bg-fill text-ink">{listing.applicationFee} app fee</Fact>
                )}
                <Fact tone="bg-sky text-ink">{listing.photos.length} photos</Fact>
              </div>

              <p className="mt-3 text-xs text-faint">
                {listing.mapAddress ?? "No address published"}
                {listing.postedAt &&
                  ` · posted ${new Date(listing.postedAt).toLocaleDateString()}`}
                {listing.bodyPhones.length + listing.bodyEmails.length > 0
                  ? ` · ${[...listing.bodyPhones, ...listing.bodyEmails].join(", ")}`
                  : " · no contact in the post, replies go through Craigslist"}
              </p>
            </section>

            {result.fromStore && (
              <div className="mt-8 rounded-2xl border border-green/35 bg-green-tint px-4 py-3">
                <p className="text-sm text-body">
                  Another student already checked this one
                  {result.checkedAt
                    ? ` on ${new Date(result.checkedAt).toLocaleDateString()}`
                    : ""}
                  . These are their findings — nothing was re-run, and nothing was spent.
                </p>
              </div>
            )}

            <div className="mt-7">
              <FindingList findings={result.findings} />
            </div>

            {mapListing && (
              <div className="mt-7 flex items-center justify-between gap-4 rounded-2xl border-2 border-green bg-panel p-4">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {mapListing.title}
                  </p>
                  <p className="mt-1 text-xs text-body">
                    ${mapListing.bodyPrice.toLocaleString()}/mo · {mapListing.bedrooms} bd
                    {mapListing.coords ? "" : " · no location to pin"}
                  </p>
                </div>
                <Button size="pill-sm" onClick={() => onShowOnMap(mapListing)}>
                  View on map
                </Button>
              </div>
            )}

            <p className="mt-4 text-xs text-faint">
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
