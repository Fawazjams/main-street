"use client";

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
      <label htmlFor="major" className="text-xs text-neutral-500">
        Walking to
      </label>
      <select
        id="major"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-sm text-neutral-900 hover:border-neutral-400 focus-visible:border-neutral-400 focus-visible:outline-none"
      >
        {MAJORS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-neutral-500">{major.building}</p>
    </div>
  );
}
