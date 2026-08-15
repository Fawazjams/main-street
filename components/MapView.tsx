"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ListingCard } from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

// mapbox-gl touches `window` at import time, so it can never be part of the
// server bundle under the App Router.
const MapCanvas = dynamic(() => import("@/components/MapCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-neutral-100" />,
});

interface MapViewProps {
  listings: Listing[];
  /** False while this panel sits hidden behind the other tab. */
  active: boolean;
}

export function MapView({ listings, active }: MapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const placedCount = listings.filter((l) => l.coords !== null).length;
  const onRequestCount = listings.filter(
    (l) => l.coords === null && l.addressStatus === "on-request",
  ).length;

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-96 shrink-0 flex-col border-r border-neutral-200">
        <div className="border-b border-neutral-200 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-900">
            {listings.length} listings near UT Austin
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {placedCount} on the map
            {onRequestCount > 0 &&
              `, ${onRequestCount} ${onRequestCount === 1 ? "shares" : "share"} the address on contact`}
          </p>
        </div>

        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard
                listing={listing}
                selected={listing.id === selectedId}
                onSelect={setSelectedId}
              />
              <a
                href={listing.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block px-1 text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
              >
                View original posting
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1">
        <MapCanvas
          listings={listings}
          selectedId={selectedId}
          onSelect={setSelectedId}
          active={active}
        />
      </div>
    </div>
  );
}
