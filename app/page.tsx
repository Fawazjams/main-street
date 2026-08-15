"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapView } from "@/components/MapView";
import { BackgroundChecker } from "@/components/BackgroundChecker";
import { seedListings } from "@/lib/seedListings";
import type { Listing } from "@/lib/types";

type TabKey = "map" | "checker";

export default function Home() {
  // Tab state lives here rather than inside a tab component, so merging the two
  // views into one screen later is a rearrange instead of a rewrite.
  const [tab, setTab] = useState<TabKey>("map");

  // In memory for now. This becomes a Supabase query without the rest of the
  // tree noticing, since everything downstream only reads Listing[].
  const [listings, setListings] = useState<Listing[]>(seedListings);

  const addToMap = (listing: Listing) => {
    setListings((current) => {
      // Match on the source URL, not the id: a listing already seeded on the map
      // and the same listing arriving from a check are the same place. Checking
      // it should upgrade the existing card, not drop a second pin on top.
      const existing = current.findIndex((l) => l.sourceUrl === listing.sourceUrl);
      if (existing === -1) return [listing, ...current];

      const merged = [...current];
      merged[existing] = { ...current[existing], ...listing, id: current[existing].id };
      return merged;
    });
    setTab("map");
  };

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as TabKey)}
      className="flex h-dvh flex-col gap-0"
    >
      <header className="flex shrink-0 items-center justify-between gap-6 border-b border-neutral-200 px-6 py-3">
        <div>
          <h1 className="text-base font-medium text-neutral-900">Arcosanti</h1>
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
        <MapView listings={listings} active={tab === "map"} />
      </TabsContent>

      <TabsContent
        value="checker"
        keepMounted
        className={tab === "checker" ? "min-h-0 flex-1" : "hidden"}
      >
        <BackgroundChecker
          onAddToMap={addToMap}
          verifiedUrls={listings.filter((l) => l.verified).map((l) => l.sourceUrl)}
        />
      </TabsContent>
    </Tabs>
  );
}
