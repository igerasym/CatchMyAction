"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

interface Photo {
  id: string;
  previewUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  priceInCents: number;
}

interface Props {
  sessionId: string;
  previewBaseUrl: string;
  initialPhotos: Photo[];
  initialCursor: string | null;
}

export default function PhotoGrid({
  sessionId,
  previewBaseUrl,
  initialPhotos,
  initialCursor,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = (session?.user as any)?.id;

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/photos?cursor=${cursor}&limit=24`
      );
      const data = await res.json();
      const newPhotos: Photo[] = data.photos.map((p: any) => ({
        ...p,
        previewUrl: `${previewBaseUrl}${p.previewKey}`,
        thumbnailUrl: `${previewBaseUrl}${p.thumbnailKey}`,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
      setCursor(data.nextCursor);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, sessionId, previewBaseUrl]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor && !loading) {
          loadMore();
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loading, loadMore]);

  async function handlePurchase(photo: Photo) {
    if (!userId) {
      router.push("/login");
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch(`/api/photos/${photo.id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.purchased || data.error === "Already purchased") {
        setPurchasedIds((prev) => new Set(prev).add(photo.id));
        const dlRes = await fetch(
          `/api/photos/${photo.id}/download?userId=${userId}`
        );
        const dlData = await dlRes.json();
        if (dlData.downloadUrl) window.open(dlData.downloadUrl, "_blank");
      } else {
        alert(data.error || "Something went wrong");
      }
    } catch {
      alert("Failed to purchase");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <>
      {/* Thumbnail grid with lazy loading */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="aspect-[4/3] bg-white/5 rounded-lg overflow-hidden hover:ring-2 hover:ring-ocean-500 transition-all focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            <img
              src={photo.thumbnailUrl}
              alt="Surf photo"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </button>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-8 text-center">
        {loading && (
          <div className="inline-flex items-center gap-2 text-white/30 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading more photos...
          </div>
        )}
        {!cursor && photos.length > 0 && (
          <p className="text-white/30 text-sm">All {photos.length} photos loaded</p>
        )}
      </div>

      {/* Photo detail modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo detail"
        >
          <div
            className="bg-[#1a1a2e] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedPhoto.previewUrl}
                alt="Surf photo preview"
                className="w-full rounded-t-xl"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-white">
                  ${(selectedPhoto.priceInCents / 100).toFixed(2)}
                </p>
                <p className="text-sm text-white/40">
                  {selectedPhoto.width} × {selectedPhoto.height} · High-res download
                </p>
              </div>
              <button
                onClick={() => handlePurchase(selectedPhoto)}
                disabled={purchasing}
                className={`px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 ${
                  purchasedIds.has(selectedPhoto.id)
                    ? "bg-green-600 text-white"
                    : "bg-ocean-600 text-white hover:bg-ocean-700"
                }`}
              >
                {purchasing
                  ? "Processing..."
                  : purchasedIds.has(selectedPhoto.id)
                  ? "Download Again"
                  : "Buy & Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
