"use client";

interface PinMapProps {
  pin: { lat: number; lng: number };
  geocoded: { lat: number; lng: number };
  miles: number;
  address: string;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * The Craigslist pin and the stated address, on one map.
 *
 * A static image rather than a second interactive map: this is a fact to look
 * at, not a thing to pan around, and it keeps a whole mapbox-gl instance out of
 * the checker panel.
 */
export function PinMap({ pin, geocoded, miles, address }: PinMapProps) {
  if (!TOKEN) return null;

  const distance =
    miles < 0.1 ? `${Math.round(miles * 5280)} feet apart` : `${miles.toFixed(1)} miles apart`;

  // Blush for the poster-controlled pin, green for the address we resolved.
  const markers = `pin-s+e89b9b(${pin.lng},${pin.lat}),pin-s+3d6b4f(${geocoded.lng},${geocoded.lat})`;

  // "auto" frames both points, but collapses to absurd zoom when they coincide,
  // so near-identical points get a fixed frame instead. Mapbox rejects the
  // padding parameter with an explicit viewport (422), so it rides with "auto".
  const tight = miles < 0.05;
  // Centre between the two so both stay in frame, not on one of them.
  const midLng = (pin.lng + geocoded.lng) / 2;
  const midLat = (pin.lat + geocoded.lat) / 2;
  const viewport = tight ? `${midLng},${midLat},16,0` : "auto";
  const padding = tight ? "" : "&padding=50";

  const src =
    `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${markers}/${viewport}/560x260@2x` +
    `?access_token=${TOKEN}${padding}`;

  return (
    <figure className="mt-3 overflow-hidden rounded-lg border border-line bg-panel">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Map showing the Craigslist pin and ${address}, ${distance}`}
          className="block h-auto w-full"
          width={560}
          height={260}
        />
        <span className="absolute right-2 top-2 rounded bg-ink/85 px-2 py-1 text-[11px] font-medium text-cream">
          {distance}
        </span>
      </div>
      <figcaption className="flex flex-wrap gap-4 border-t border-line px-3 py-2 text-[11px] text-body">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-blush" />
          Craigslist pin
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-green" />
          {address}
        </span>
      </figcaption>
    </figure>
  );
}
