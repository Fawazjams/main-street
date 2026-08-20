"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Coords, Listing } from "@/lib/types";
import { CAMPUS } from "@/lib/campus";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// UT Austin, used only when no listing has coordinates yet.
const FALLBACK_CENTER: [number, number] = [-97.7431, 30.2849];

const CAMPUS_SOURCE = "campus";
const WALK_SOURCE = "walk-route";
const ORANGE = "#ea580c";

const EMPTY = { type: "FeatureCollection", features: [] } as const;

/**
 * Campus outline and the walking path.
 *
 * Both are style layers rather than DOM markers, so unlike the price pins these
 * genuinely cannot be added until the style has loaded — there is nothing to
 * attach them to before that.
 */
function addCampusLayers(map: mapboxgl.Map) {
  if (!map.getSource(CAMPUS_SOURCE)) {
    map.addSource(CAMPUS_SOURCE, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [CAMPUS.outline as unknown as number[][]] },
      },
    });
    map.addLayer({
      id: "campus-fill",
      type: "fill",
      source: CAMPUS_SOURCE,
      paint: { "fill-color": ORANGE, "fill-opacity": 0.15 },
    });
    map.addLayer({
      id: "campus-outline",
      type: "line",
      source: CAMPUS_SOURCE,
      paint: { "line-color": ORANGE, "line-width": 1.5, "line-opacity": 0.8 },
    });
  }

  if (!map.getSource(WALK_SOURCE)) {
    map.addSource(WALK_SOURCE, { type: "geojson", data: EMPTY });
    map.addLayer({
      id: "walk-line",
      type: "line",
      source: WALK_SOURCE,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ORANGE,
        "line-width": 3,
        "line-dasharray": [1.5, 1.5],
      },
    });
  }
}

interface MapCanvasProps {
  listings: Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** False while the map sits inside a hidden tab panel. */
  active: boolean;
  /** Walking path from the selected listing to campus, when we have one. */
  walkPath: Coords[] | null;
}

export default function MapCanvas({
  listings,
  selectedId,
  onSelect,
  active,
  walkPath,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [styleReady, setStyleReady] = useState(false);

  // Kept in a ref so marker click handlers, attached once to raw DOM nodes,
  // always call the latest callback without rebuilding every marker.
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const placed = listings.filter((l) => l.coords !== null);

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;

    const markers = markersRef.current;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: FALLBACK_CENTER,
      zoom: 13,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    // If the panel was hidden at mount the canvas measured 0x0, so re-measure
    // once the style settles rather than depending on which tab opened first.
    map.on("load", () => {
      map.resize();
      // Markers can be added any time, but layers need a style to attach to.
      addCampusLayers(map);
      setStyleReady(true);
    });
    mapRef.current = map;

    return () => {
      markers.forEach((m) => m.remove());
      markers.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Markers and camera moves are DOM and camera operations - neither needs the
  // style to have finished loading, so nothing here waits on the load event.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    for (const listing of placed) {
      seen.add(listing.id);
      const existing = markersRef.current.get(listing.id);
      if (existing) {
        existing.setLngLat(listing.coords!);
        continue;
      }

      const el = document.createElement("button");
      el.type = "button";
      el.dataset.listingId = listing.id;
      el.className =
        "cursor-pointer rounded-full border border-neutral-900/15 bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-100 data-[selected=true]:border-neutral-900 data-[selected=true]:bg-neutral-900 data-[selected=true]:text-white";
      el.textContent = `$${listing.bodyPrice.toLocaleString()}`;
      el.setAttribute("aria-label", `${listing.title}, $${listing.bodyPrice} a month`);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(listing.id);
      });

      markersRef.current.set(
        listing.id,
        new mapboxgl.Marker({ element: el }).setLngLat(listing.coords!).addTo(map),
      );
    }

    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    // Frame every pin rather than hardcoding a center. Dean Keeton and 45th St
    // are far enough apart that a fixed campus center and zoom drops one of
    // them off screen, and fitBounds keeps working when the city changes.
    if (placed.length === 1) {
      map.easeTo({ center: placed[0].coords!, zoom: 15 });
    } else if (placed.length > 1) {
      const bounds = placed.reduce(
        (acc, l) => acc.extend(l.coords!),
        new mapboxgl.LngLatBounds(placed[0].coords!, placed[0].coords!),
      );
      map.fitBounds(bounds, { padding: 96, maxZoom: 15, duration: 0 });
    }
    // placed is derived from listings each render, so key the effect on listings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      marker.getElement().dataset.selected = String(id === selectedId);
    });

    const target = placed.find((l) => l.id === selectedId);
    if (mapRef.current && target) {
      mapRef.current.flyTo({ center: target.coords!, zoom: 16, duration: 900 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, listings]);

  // Redraw the dashed walking path whenever the selection changes. Cleared to
  // an empty collection rather than removed, so the layer keeps its place in
  // the stack instead of being torn down and re-added.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const source = map.getSource(WALK_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(
      walkPath && walkPath.length > 1
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: walkPath as unknown as number[][] },
          }
        : EMPTY,
    );
  }, [walkPath, styleReady]);

  // The panel stays mounted while hidden so the map is not torn down on every
  // tab switch, but a map sized inside a hidden element measures 0x0.
  useEffect(() => {
    if (active) mapRef.current?.resize();
  }, [active]);

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-50 p-8">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-neutral-900">Map needs a Mapbox token</p>
          <p className="mt-2 text-sm text-neutral-600">
            Add <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
            to <code className="rounded bg-neutral-200 px-1 py-0.5 text-xs">.env.local</code> and
            restart the dev server. Listings still show in the sidebar without it.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
