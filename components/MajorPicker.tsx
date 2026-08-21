"use client";

import { PersonSimpleWalkIcon } from "@phosphor-icons/react/ssr";

import { MAJORS, majorById } from "@/lib/majors";

interface MajorPickerProps {
  value: string;
  onChange: (id: string) => void;
}

/**
 * What the student is walking to.
 *
 * A dropdown rather than buttons: there are two dozen of these and the list
 * will only grow. The chosen building is named underneath, because "22 min"
 * means something different once you know it is 22 minutes to Townes Hall
 * rather than to a point somewhere in the middle of campus.
 */
export function MajorPicker({ value, onChange }: MajorPickerProps) {
  const major = majorById(value);

  return (
    <div>
      <label
        htmlFor="major"
        className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.05em] text-faint uppercase"
      >
        <PersonSimpleWalkIcon size={13} aria-hidden />
        Walking to
      </label>
      <select
        id="major"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-9 w-full rounded-md border border-line bg-panel px-2.5 text-sm text-ink transition-colors hover:border-line-strong focus-visible:border-green focus-visible:outline-none"
      >
        {MAJORS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-muted-ink">{major.building}</p>
    </div>
  );
}
