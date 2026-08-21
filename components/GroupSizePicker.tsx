"use client";

import { cn } from "@/lib/utils";

interface GroupSizePickerProps {
  value: number;
  onChange: (size: number) => void;
}

const SIZES = [1, 2, 3, 4, 5];

/**
 * How many people are splitting the rent.
 *
 * Deliberately independent of bedroom count. Students share rooms, and the
 * question they are actually asking is "what do I pay", not "what does a
 * bedroom cost". When real groups land, this is the control they replace.
 */
export function GroupSizePicker({ value, onChange }: GroupSizePickerProps) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.05em] text-faint uppercase">
        Splitting rent between
      </p>
      <div className="mt-1.5 flex gap-1" role="group" aria-label="Group size">
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            aria-pressed={value === size}
            className={cn(
              "h-7 min-w-9 rounded-full border px-2 text-xs transition-colors",
              value === size
                ? "border-green bg-green text-cream"
                : "border-line bg-panel text-body hover:border-line-strong",
            )}
          >
            {size}
            {size === 5 && "+"}
          </button>
        ))}
        <span className="ml-1 self-center text-xs text-muted-ink">
          {value === 1 ? "just me" : `${value} people`}
        </span>
      </div>
    </div>
  );
}
