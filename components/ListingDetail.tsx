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
    <div className="flex h-full flex-col bg-white">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 px-5 py-3">
        <div className="min-w-0">
          <p className="text-base font-medium text-neutral-900">
            ${listing.bodyPrice.toLocaleString()}
            <span className="text-sm font-normal text-neutral-500">/mo</span>
          </p>
          <p className="truncate text-xs text-neutral-500">{listing.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close listing"
          className="shrink-0 rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {listing.photos.length > 0 && (
          <PhotoStrip photos={listing.photos} title={listing.title} />
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-neutral-500">Layout</dt>
            <dd className="text-neutral-900">
              {listing.bedrooms} bd · {listing.bathrooms} ba
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Walk to {destinationName}</dt>
            <dd className="text-neutral-900">
              {walk ? `${walk.minutes} min · ${walk.miles.toFixed(1)} mi` : "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-neutral-500">Address</dt>
            <dd className="text-neutral-900">
              {listing.address ??
                (listing.addressStatus === "on-request"
                  ? "Shared once you email, text, or call"
                  : "None published")}
            </dd>
          </div>
        </dl>

        {groupSize > 1 && (
          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs text-neutral-500">
              Split {groupSize} ways
            </p>
            <p className="mt-0.5 text-sm text-neutral-900">
              <span className="font-medium">${share.toLocaleString()}</span> each ·{" "}
              <span className="text-neutral-500">
                ${listing.bodyPrice.toLocaleString()} total
              </span>
            </p>
          </div>
        )}

        <div className="mt-6">
          {investigation ? (
            <>
              <p className="mb-4 text-xs text-neutral-500">
                Checked {whenChecked(investigation.checkedAt)}. You are reading what that
                check found — nobody had to run it again.
              </p>
              <FindingList findings={investigation.findings} />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 px-5 py-8 text-center">
              <p className="text-sm font-medium text-neutral-900">Not checked yet</p>
              <p className="mx-auto mt-1 max-w-xs text-sm text-neutral-600">
                Nobody has run this one through the background checker. Paste its link in
                the checker tab and the findings will land here for everyone.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-neutral-200 px-5 py-3">
        <Button
          variant="outline"
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
