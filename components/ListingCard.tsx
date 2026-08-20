"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { perPersonRent, type Listing } from "@/lib/types";
import { photoAt } from "@/lib/photos";

interface ListingCardProps {
  listing: Listing;
  selected: boolean;
  onSelect: (id: string) => void;
  /** How many people are splitting the rent. */
  groupSize: number;
}

export function ListingCard({
  listing,
  selected,
  onSelect,
  groupSize,
}: ListingCardProps) {
  const placed = listing.coords !== null;
  const share = perPersonRent(listing, groupSize);

  return (
    <button
      type="button"
      onClick={() => onSelect(listing.id)}
      aria-pressed={selected}
      className={cn(
        "w-full overflow-hidden rounded-lg border text-left transition-colors",
        selected
          ? "border-neutral-900 bg-neutral-50"
          : "border-neutral-200 bg-white hover:border-neutral-400",
      )}
    >
      {listing.photos.length > 0 && (
        <Image
          src={photoAt(listing.photos[0], "300x300")}
          alt=""
          width={300}
          height={300}
          className="h-28 w-full object-cover"
          unoptimized
        />
      )}

      <div className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-medium text-neutral-900">
          ${listing.bodyPrice.toLocaleString()}
          <span className="text-sm font-normal text-neutral-500">/mo</span>
        </span>
        <span className="shrink-0 text-xs text-neutral-500">
          {listing.bedrooms} bd &middot; {listing.bathrooms} ba
        </span>
      </div>

      <p className="mt-1 line-clamp-2 text-sm text-neutral-700">{listing.title}</p>

      <p className="mt-2 text-xs text-neutral-500">
        {listing.address ??
          (listing.addressStatus === "on-request"
            ? "Address shared once you email, text, or call"
            : "No address posted")}
      </p>

      {groupSize > 1 && (
        <p className="mt-1.5 text-xs text-neutral-600">
          <span className="text-neutral-500">Total ${listing.bodyPrice.toLocaleString()}</span>
          {" · "}
          <span className="font-medium text-neutral-900">
            you pay ${share.toLocaleString()}
          </span>
        </p>
      )}


      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {listing.verified ? (
          <Badge variant="secondary">Checked</Badge>
        ) : (
          <Badge variant="outline">Not checked</Badge>
        )}
        {!placed && (
          <Badge variant="outline">
            {listing.addressStatus === "on-request" ? "Address on request" : "No pin"}
          </Badge>
        )}
        {/* An unverified signal, not an error, so this stays a quiet chip. */}
        {listing.titlePrice !== undefined && listing.titlePrice !== listing.bodyPrice && (
          <Badge variant="outline">
            Title says ${listing.titlePrice.toLocaleString()}
          </Badge>
        )}
      </div>
      </div>
    </button>
  );
}
