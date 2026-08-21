"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/Wordmark";
import { MapView } from "@/components/MapView";
import { BackgroundChecker } from "@/components/BackgroundChecker";
import { seedListings } from "@/lib/seedListings";
import type { Listing } from "@/lib/types";
import type { StoredListing } from "@/lib/db/listings";

type TabKey = "map" | "checker";

export default function AppPage() {
  const router = useRouter();

  // Tab state lives here rather than inside a tab component, so merging the two
  // views into one screen later is a rearrange instead of a rewrite.
  const [tab, setTab] = useState<TabKey>("map");

  // Seeds are the starting point and the fallback. Once Supabase answers, the
  // shared map replaces them - and a database that is down or unconfigured
  // leaves a working demo rather than an empty page.
  const [listings, setListings] = useState<Listing[]>(seedListings);
  const [persisted, setPersisted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Which tab you land on comes from the chooser, which links to /app and
  // /app?tab=checker. Read once on mount: the address bar seeds the tab, it
  // does not drive it.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "checker") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTab("checker");
    }
  }, []);

  // Keep the tab in the URL so the view is linkable, but with replaceState -
  // flipping tabs should not fill the back button. Selecting a listing uses
  // pushState in MapView, which is the navigation people actually expect to
  // undo. Every other parameter is preserved, so the two do not fight.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (tab === "checker") params.set("tab", "checker");
    else params.delete("tab");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [tab]);

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
      className="flex h-dvh flex-col gap-0 bg-cream"
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/start"
            aria-label="Back to the chooser"
            className="text-muted-ink transition-colors hover:text-ink"
          >
            <ArrowLeftIcon size={16} aria-hidden />
          </Link>
          <Wordmark size="sm" className="min-w-0" />
        </div>

        <TabsList variant="pill">
          <TabsTrigger value="map">Map view</TabsTrigger>
          <TabsTrigger value="checker">Background checker</TabsTrigger>
        </TabsList>

        <Button
          variant="ink"
          size="pill-sm"
          onClick={() => {
            sessionStorage.removeItem("ms.email");
            router.push("/");
          }}
        >
          Log out
        </Button>
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
