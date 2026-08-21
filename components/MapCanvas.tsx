"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Coords, Listing } from "@/lib/types";
import { CAMPUS } from "@/lib/campus";
import type { WalkRoute } from "@/lib/walk";
import type { Major } from "@/lib/majors";

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

/**
 * The point halfway along the route by distance rather than by index.
 *
 * Route geometry bunches up around corners, so the middle array element can sit
 * well off the visual centre — which is where the label wants to be.
 */
function midpointOf(path: Coords[]): Coords {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    seg.push(d);
    total += d;
  }

  let run = 0;
  for (let i = 0; i < seg.length; i += 1) {
    if (run + seg[i] >= total / 2) {
      const t = seg[i] === 0 ? 0 : (total / 2 - run) / seg[i];
      return [
        path[i][0] + (path[i + 1][0] - path[i][0]) * t,
        path[i][1] + (path[i + 1][1] - path[i][1]) * t,
      ];
    }
    run += seg[i];
  }
  return path[Math.floor(path.length / 2)];
}

interface MapCanvasProps {
  listings: Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** False while the map sits inside a hidden tab panel. */
  active: boolean;
  /** Walking route from the selected listing to campus, when we have one. */
  walk: WalkRoute | null;
  /** The building every walk is measured to. */
  destination: Major;
}

export default function MapCanvas({
  listings,
  selectedId,
  onSelect,
  active,
  walk,
  destination,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const walkLabelRef = useRef<mapboxgl.Marker | null>(null);
  const destinationRef = useRef<mapboxgl.Marker | null>(null);
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
      walkLabelRef.current?.remove();
      walkLabelRef.current = null;
      destinationRef.current?.remove();
      destinationRef.current = null;
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
  }, [selectedId, listings]);

  /**
   * A standing marker on whatever building the walks are measured to.
   *
   * Visible before any listing is picked, so choosing a major shows you where
   * you are actually walking rather than only changing a number.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    destinationRef.current?.remove();

    const el = document.createElement("div");
    el.className =
      "flex items-center gap-1.5 whitespace-nowrap rounded-full border border-orange-600 bg-white px-2.5 py-1 text-xs font-medium text-orange-700 shadow-sm";
    const dot = document.createElement("span");
    dot.className = "inline-block h-2 w-2 shrink-0 rounded-full bg-orange-600";
    el.append(dot, document.createTextNode(destination.building));
    el.title = destination.label;

    destinationRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat(destination.coords)
      .addTo(map);
  }, [destination]);

  /**
   * Draw the route, label it, and frame both ends.
   *
   * Selecting a listing frames the whole walk rather than zooming into the pin:
   * the question being asked is "how far is this from campus", and a close-up
   * of the pin is the one view that cannot answer it. The route arrives
   * asynchronously, so this re-runs when it lands and reframes then.
   *
   * The label is a DOM marker rather than a symbol layer - no font dependency,
   * and it styles with the same Tailwind as the price pins.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    const path = walk?.geometry ?? null;
    const source = map.getSource(WALK_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    source?.setData(
      path && path.length > 1
        ? {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: path as unknown as number[][] },
          }
        : EMPTY,
    );

    walkLabelRef.current?.remove();
    walkLabelRef.current = null;

    const target = placed.find((l) => l.id === selectedId);
    if (!target) return;

    if (walk && path && path.length > 1) {
      const bounds = path.reduce(
        (acc, point) => acc.extend(point as [number, number]),
        new mapboxgl.LngLatBounds(path[0] as [number, number], path[0] as [number, number]),
      );
      map.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 900 });

      const el = document.createElement("div");
      el.className =
        "whitespace-nowrap rounded-full bg-orange-600 px-2.5 py-1 text-xs font-medium text-white shadow-sm";
      el.textContent = `${walk.minutes} min walk · ${walk.miles.toFixed(1)} mi`;
      walkLabelRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat(midpointOf(path))
        .addTo(map);
    } else {
      // No route yet, or none to be had. Centre the pin and wait.
      map.flyTo({ center: target.coords!, zoom: 15, duration: 900 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, walk, styleReady, listings]);

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
