"use client";

import Image from "next/image";
import { photoAt } from "@/lib/photos";

interface PhotoStripProps {
  photos: string[];
  title?: string | null;
}

/**
 * The listing's own photos.
 *
 * These are shown as evidence of what is being advertised, not as proof of
 * anything - nothing here checks whether the photos belong to this property.
 * That would need a reverse-image index, which is the paid piece we do not have.
 */
export function PhotoStrip({ photos, title }: PhotoStripProps) {
  if (photos.length === 0) return null;

  const [lead, ...rest] = photos;

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        <a href={photoAt(lead, "1200x900")} target="_blank" rel="noreferrer">
          <Image
            src={photoAt(lead, "600x450")}
            alt={title ? `${title} — main photo` : "Listing photo"}
            width={600}
            height={450}
            className="h-56 w-full object-cover transition-opacity hover:opacity-90"
            unoptimized
          />
        </a>
      </div>

      {rest.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {rest.map((photo, index) => (
            <a
              key={photo}
              href={photoAt(photo, "1200x900")}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-100"
            >
              <Image
                src={photoAt(photo, "300x300")}
                alt={`Listing photo ${index + 2}`}
                width={300}
                height={300}
                className="h-16 w-20 object-cover transition-opacity hover:opacity-90"
                unoptimized
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
