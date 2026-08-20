"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ListingCard } from "@/components/ListingCard";
import { ListingDetail } from "@/components/ListingDetail";
import { GroupSizePicker } from "@/components/GroupSizePicker";
import { walkToCampus, type WalkRoute } from "@/lib/walk";
import type { Listing } from "@/lib/types";
import type { StoredListing } from "@/lib/db/listings";

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
  /** True once the shared map has replaced the seed listings. */
  persisted: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function MapView({
  listings,
  active,
  persisted,
  selectedId,
  onSelect,
}: MapViewProps) {
  // One group size for the whole map. A student searches as a group, not a
  // listing at a time, and this is the value a real group replaces later.
  const [groupSize, setGroupSize] = useState(1);
  const [walks, setWalks] = useState<Record<string, WalkRoute | null>>({});

  const placedCount = listings.filter((l) => l.coords !== null).length;
  const onRequestCount = listings.filter(
    (l) => l.coords === null && l.addressStatus === "on-request",
  ).length;

  // The open listing lives in the URL, so the view can be linked to and
  // survives a refresh. Back and forward work because this pushes state rather
  // than replacing it.
  useEffect(() => {
    // Seeding selection from the URL is the "synchronise with an external
    // system" case the rule exists to permit — the address bar is the source of
    // truth here, and there is no render-time way to read it without risking a
    // hydration mismatch.
    const fromUrl = new URLSearchParams(window.location.search).get("listing");
    if (fromUrl) onSelect(fromUrl);

    const onPop = () => {
      onSelect(new URLSearchParams(window.location.search).get("listing"));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // Runs once: this seeds selection from the URL, it does not follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = params.get("listing");
    if (current === selectedId) return;

    if (selectedId) params.set("listing", selectedId);
    else params.delete("listing");
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
  }, [selectedId]);

  // Walking routes are fetched once per listing and cached in lib/walk, so
  // re-selecting a listing costs nothing and the drawn path always matches the
  // minutes shown against it.
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

  const selected = listings.find((l) => l.id === selectedId) ?? null;
  const selectedWalk = selectedId ? (walks[selectedId] ?? null) : null;

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-96 shrink-0 flex-col border-r border-neutral-200">
        {selected ? (
          <ListingDetail
            listing={selected as StoredListing}
            groupSize={groupSize}
            walk={selectedWalk}
            onClose={() => onSelect(null)}
          />
        ) : (
          <>
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-medium text-neutral-900">
                {listings.length} listings near UT Austin
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {placedCount} on the map
                {onRequestCount > 0 &&
                  `, ${onRequestCount} ${onRequestCount === 1 ? "shares" : "share"} the address on contact`}
                {!persisted && " · not saved yet"}
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
                    onSelect={onSelect}
                    groupSize={groupSize}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        <MapCanvas
          listings={listings}
          selectedId={selectedId}
          onSelect={onSelect}
          active={active}
          walk={selectedWalk}
        />
      </div>
    </div>
  );
}
