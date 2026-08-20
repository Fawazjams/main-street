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
      <p className="text-xs text-neutral-500">Splitting rent between</p>
      <div className="mt-1.5 flex gap-1" role="group" aria-label="Group size">
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(size)}
            aria-pressed={value === size}
            className={cn(
              "h-7 min-w-9 rounded-md border px-2 text-xs transition-colors",
              value === size
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
            )}
          >
            {size}
            {size === 5 && "+"}
          </button>
        ))}
        <span className="ml-1 self-center text-xs text-neutral-500">
          {value === 1 ? "just me" : `${value} people`}
        </span>
      </div>
    </div>
  );
}
