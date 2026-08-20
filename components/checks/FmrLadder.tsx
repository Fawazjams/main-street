"use client";

import { cn } from "@/lib/utils";

interface FmrLadderProps {
  bars: { label: string; value: number; highlight: boolean }[];
  listingPrice: number;
  area: string;
  year?: string;
}

const CHART_HEIGHT = 132;

/**
 * HUD's whole bedroom ladder with the asking rent drawn across it.
 *
 * The single percentage ("45% below") is accurate but abstract. Seeing the rent
 * line fall under every bar in the area does the work of the sentence before
 * anyone reads it. The bar for this listing's own bedroom count is the one that
 * matters; the rest are there to give it somewhere to stand.
 */
export function FmrLadder({ bars, listingPrice, area, year }: FmrLadderProps) {
  if (bars.length === 0) return null;

  // The rent line can sit above every bar, so it has to count toward the scale.
  const ceiling = Math.max(...bars.map((b) => b.value), listingPrice) * 1.12;
  const toHeight = (value: number) => Math.max(2, (value / ceiling) * CHART_HEIGHT);
  const lineOffset = toHeight(listingPrice);

  return (
    <figure className="mt-3 rounded-lg border border-neutral-200 bg-white p-4">
      <figcaption className="text-xs text-neutral-600">
        HUD fair-market rent by bedroom — {area}
        {year ? ` (${year})` : ""}
      </figcaption>

      <div className="relative mt-6" style={{ height: CHART_HEIGHT }}>
        {/* The asking rent, drawn across every bar rather than beside one. */}
        <div
          className="absolute inset-x-0 z-10 border-t border-dashed border-red-400"
          style={{ bottom: lineOffset }}
        >
          <span className="absolute -top-2.5 right-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
            this listing ${listingPrice.toLocaleString()}
          </span>
        </div>

        <div className="flex h-full items-end gap-2">
          {bars.map((bar) => (
            <div key={bar.label} className="flex flex-1 flex-col items-center justify-end">
              <span
                className={cn(
                  "mb-1 text-[10px]",
                  bar.highlight ? "font-medium text-neutral-900" : "text-neutral-500",
                )}
              >
                ${bar.value.toLocaleString()}
              </span>
              <div
                className={cn(
                  "w-full rounded-t",
                  bar.highlight ? "bg-neutral-800" : "bg-neutral-200",
                )}
                style={{ height: toHeight(bar.value) }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        {bars.map((bar) => (
          <span
            key={bar.label}
            className={cn(
              "flex-1 text-center text-[11px]",
              bar.highlight ? "font-medium text-neutral-900" : "text-neutral-500",
            )}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
