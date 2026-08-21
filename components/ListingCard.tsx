"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { perPersonRent, type Listing } from "@/lib/types";
import { accentFor } from "@/lib/accents";
import { photoAt } from "@/lib/photos";

interface ListingCardProps {
  listing: Listing;
  selected: boolean;
  onSelect: (id: string) => void;
  /** How many people are splitting the rent. */
  groupSize: number;
}

// Quiet, uniform, and identical whatever the chip says. These state facts about
// the post - none of them is a verdict, and colouring one of them would make it
// read like one.
const CHIP =
  "inline-flex h-[22px] items-center rounded-full border border-line bg-soft px-2.5 text-[11px] text-body";

export function ListingCard({
  listing,
  selected,
  onSelect,
  groupSize,
}: ListingCardProps) {
  const placed = listing.coords !== null;
  const share = perPersonRent(listing, groupSize);
  const accent = accentFor(listing.id);

  return (
    <button
      type="button"
      onClick={() => onSelect(listing.id)}
      aria-pressed={selected}
      className={cn(
        "w-full overflow-hidden rounded-2xl border-2 bg-panel text-left transition-colors",
        selected ? "border-ink" : accent.border,
      )}
    >
      {listing.photos.length > 0 ? (
        <Image
          src={photoAt(listing.photos[0], "300x300")}
          alt=""
          width={300}
          height={300}
          className="h-24 w-full object-cover"
          unoptimized
        />
      ) : (
        // A tinted band rather than a grey box: the card keeps its shape and
        // its colour whether or not the post published photos.
        <div
          className={cn(
            "flex h-24 items-center justify-center font-mono text-[10px] text-ink/50",
            accent.tint,
          )}
        >
          no photos posted
        </div>
      )}

      <div className="p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-heading text-base font-semibold text-ink">
            ${listing.bodyPrice.toLocaleString()}
            <span className="font-sans text-[13px] font-normal text-muted-ink">/mo</span>
          </span>
          <span className="shrink-0 text-xs whitespace-nowrap text-muted-ink">
            {listing.bedrooms} bd &middot; {listing.bathrooms} ba
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-body">
          {listing.title}
        </p>

        <p className="mt-2 text-xs text-faint">
          {listing.address ??
            (listing.addressStatus === "on-request"
              ? "Address shared once you email, text, or call"
              : "No address posted")}
        </p>

        {groupSize > 1 && (
          <p className="mt-1.5 text-xs text-body">
            Total ${listing.bodyPrice.toLocaleString()} &middot;{" "}
            <span className="font-semibold text-ink">
              you pay ${share.toLocaleString()}
            </span>
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={CHIP}>{listing.verified ? "Checked" : "Not checked"}</span>
          {!placed && (
            <span className={CHIP}>
              {listing.addressStatus === "on-request" ? "Address on request" : "No pin"}
            </span>
          )}
          {/* An unverified signal, not an error, so this stays a quiet chip. */}
          {listing.titlePrice !== undefined && listing.titlePrice !== listing.bodyPrice && (
            <span className={CHIP}>
              Title says ${listing.titlePrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
