"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/components/MapView";
import { BackgroundChecker } from "@/components/BackgroundChecker";
import { seedListings } from "@/lib/seedListings";
import type { Listing } from "@/lib/types";
import type { StoredListing } from "@/lib/db/listings";

type TabKey = "map" | "checker";

export default function Home() {
  // Tab state lives here rather than inside a tab component, so merging the two
  // views into one screen later is a rearrange instead of a rewrite.
  const [tab, setTab] = useState<TabKey>("map");

  // Seeds are the starting point and the fallback. Once Supabase answers, the
  // shared map replaces them - and a database that is down or unconfigured
  // leaves a working demo rather than an empty page.
  const [listings, setListings] = useState<Listing[]>(seedListings);
  const [persisted, setPersisted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/listings");
      const data = await response.json();
      if (data.configured && Array.isArray(data.listings) && data.listings.length > 0) {
        setListings(data.listings as StoredListing[]);
        setPersisted(true);
      }
    } catch {
      // Keep the seeds. The map is still useful without the shared corpus.
    }
  }, []);

  useEffect(() => {
    // Loading the shared map on mount. The rule guards against cascading
    // renders from synchronous setState; this one lands after a network round
    // trip, and the database is exactly the external system effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  // Checking a listing stores it, so there is nothing to "add" afterwards -
  // this pulls the shared map back down and points at what was just checked.
  const showOnMap = useCallback(
    async (listing: Listing) => {
      await refresh();
      setSelectedId(listing.id);
      setTab("map");
    },
    [refresh],
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as TabKey)}
      className="flex h-dvh flex-col gap-0"
    >
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-neutral-200 px-6 py-3">
        <div>
          <h1 className="text-base font-medium text-neutral-900">Main Street</h1>
          <p className="text-xs text-neutral-500">Student housing near UT Austin</p>
        </div>

        <TabsList>
          <TabsTrigger value="map">Map view</TabsTrigger>
          <TabsTrigger value="checker">Background checker</TabsTrigger>
        </TabsList>
      </header>

      {/*
        keepMounted so switching tabs does not tear down and rebuild the map.

        The explicit `hidden` class is not redundant. Base UI drops its own
        `hidden` attribute only after the outgoing panel's animations settle,
        which it detects inside a requestAnimationFrame - and rAF does not run
        while the page is backgrounded. Without this class, switching tabs in a
        hidden tab leaves both panels stacked on top of each other.

        Also deliberately no `flex` utility here: Tailwind's `flex` class sits in
        a later cascade layer than the `[hidden]` base rule and would beat it.
      */}
      <TabsContent
        value="map"
        keepMounted
        className={tab === "map" ? "min-h-0 flex-1" : "hidden"}
      >
        <MapView
          listings={listings}
          active={tab === "map"}
          persisted={persisted}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </TabsContent>

      <TabsContent
        value="checker"
        keepMounted
        className={tab === "checker" ? "min-h-0 flex-1" : "hidden"}
      >
        <BackgroundChecker onShowOnMap={showOnMap} />
      </TabsContent>
    </Tabs>
  );
}
