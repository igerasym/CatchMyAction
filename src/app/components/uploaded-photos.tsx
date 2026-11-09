"use client";

import { X } from "lucide-react";

export interface UploadedPhoto {
  id: string;
  thumbnailUrl: string;
}

interface Props {
  photos: UploadedPhoto[];
  onRemove: (id: string) => void;
  busyId?: string | null;
}

/** What has been uploaded so far, with a way to drop the ones you don't want before publishing. */
export function UploadedPhotos({ photos, onRemove, busyId }: Props) {
  if (photos.length === 0) return null;
  return (
    <section aria-label="Uploaded photos">
      <p className="hud mb-3">Uploaded · {photos.length} photo{photos.length === 1 ? "" : "s"}</p>
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((p, i) => (
          <li key={p.id} className="relative aspect-square bg-ink border border-line">
            <img src={p.thumbnailUrl} alt={`Uploaded photo ${i + 1}`} draggable={false}
              className="w-full h-full object-cover select-none" />
            <button type="button" onClick={() => onRemove(p.id)} disabled={busyId === p.id}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute top-1 right-1 w-8 h-8 grid place-items-center bg-ink/80 text-bone hover:bg-rec hover:text-rec-ink transition-colors disabled:opacity-50">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
