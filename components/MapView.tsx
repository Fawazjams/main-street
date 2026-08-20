"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ListingCard } from "@/components/ListingCard";
import { GroupSizePicker } from "@/components/GroupSizePicker";
import { walkToCampus, type WalkRoute } from "@/lib/walk";
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
  // One group size for the whole map. A student searches as a group, not a
  // listing at a time, and this is the value a real group replaces later.
  const [groupSize, setGroupSize] = useState(1);
  const [walks, setWalks] = useState<Record<string, WalkRoute | null>>({});

  const placedCount = listings.filter((l) => l.coords !== null).length;
  const onRequestCount = listings.filter(
    (l) => l.coords === null && l.addressStatus === "on-request",
  ).length;

  // Walking routes are fetched once per listing and cached in lib/walk, so
  // re-selecting a listing costs nothing and the drawn path always matches the
  // minutes on its card.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const listing of listings) {
        if (!listing.coords || listing.id in walks) continue;
        const route = await walkToCampus(listing.coords);
        if (cancelled) return;
        setWalks((current) => ({ ...current, [listing.id]: route }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // `walks` is read only to skip work already done; keying on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  const selectedWalk = selectedId ? walks[selectedId] : null;

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

        <div className="border-b border-neutral-200 px-4 py-3">
          <GroupSizePicker value={groupSize} onChange={setGroupSize} />
        </div>

        <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard
                listing={listing}
                selected={listing.id === selectedId}
                onSelect={setSelectedId}
                groupSize={groupSize}
                walk={walks[listing.id] ?? null}
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
          walkPath={selectedWalk?.geometry ?? null}
        />
      </div>
    </div>
  );
}
