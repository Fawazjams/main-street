"use client";

import { PhotoStrip } from "@/components/PhotoStrip";
import { FindingList } from "@/components/FindingList";
import { Button } from "@/components/ui/button";
import { perPersonRent } from "@/lib/types";
import type { StoredListing } from "@/lib/db/listings";
import type { WalkRoute } from "@/lib/walk";

interface ListingDetailProps {
  listing: StoredListing;
  groupSize: number;
  walk: WalkRoute | null;
  /** The building the walk is measured to. */
  destinationName: string;
  onClose: () => void;
}

const whenChecked = (iso: string) => {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return then.toLocaleDateString();
};

const FIELD_LABEL = "text-[11px] font-bold uppercase tracking-[0.06em] text-faint";

/**
 * Everything known about one listing.
 *
 * This is the screen the shared map exists for. A listing carries the findings
 * of whoever checked it first, so the second student reads the evidence rather
 * than a badge saying somebody else was satisfied.
 */
export function ListingDetail({
  listing,
  groupSize,
  walk,
  destinationName,
  onClose,
}: ListingDetailProps) {
  const share = perPersonRent(listing, groupSize);
  const investigation = listing.investigation;

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="shrink-0 border-b border-line px-4 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-ink transition-colors hover:text-ink"
        >
          &larr; Back to listings
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {listing.photos.length > 0 && (
          <PhotoStrip photos={listing.photos} title={listing.title} />
        )}

        <h3 className="mt-3.5 font-heading text-[17px] leading-snug font-semibold text-ink">
          {listing.title}
        </h3>
        <p className="mt-1 text-[15px] font-semibold text-ink">
          ${listing.bodyPrice.toLocaleString()}
          <span className="font-normal text-muted-ink">/mo</span> · {listing.bedrooms} bd
          · {listing.bathrooms} ba
        </p>
        <p className="mt-1 text-[13px] text-muted-ink">
          {listing.address ??
            (listing.addressStatus === "on-request"
              ? "Address shared once you email, text, or call"
              : "No address published")}
        </p>

        <div className="mt-3.5 border-t border-line pt-3.5">
          <p className={FIELD_LABEL}>Walking to {destinationName}</p>
          <p className="mt-1 text-[13px] text-body">
            {walk
              ? `${walk.minutes} min · ${walk.miles.toFixed(1)} mi, drawn on the map`
              : listing.coords
                ? "Working out the route…"
                : "No pin, so there is nothing to measure from."}
          </p>
        </div>

        {groupSize > 1 && (
          <div className="mt-3.5 rounded-2xl border border-line bg-soft px-4 py-3">
            <p className={FIELD_LABEL}>Split {groupSize} ways</p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-semibold">${share.toLocaleString()}</span> each ·{" "}
              <span className="text-muted-ink">
                ${listing.bodyPrice.toLocaleString()} total
              </span>
            </p>
          </div>
        )}

        <div className="mt-6">
          {investigation ? (
            <>
              <p className="mb-3.5 text-xs text-faint">
                Checked {whenChecked(investigation.checkedAt)}. You are reading what that
                check found — nobody had to run it again.
              </p>
              <FindingList findings={investigation.findings} />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong bg-soft px-5 py-8 text-center">
              <p className="font-heading text-[15px] font-semibold text-ink">
                Not checked yet
              </p>
              <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-body">
                Nobody has run this one through the background checker. Paste its link in
                the checker tab and the findings will land here for everyone.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-line px-4 py-3">
        <Button
          variant="ink"
          size="pill-sm"
          className="w-full"
          onClick={() => window.open(listing.sourceUrl, "_blank", "noreferrer")}
          disabled={!listing.sourceUrl.startsWith("http")}
        >
          View original posting
        </Button>
      </div>
    </div>
  );
}
