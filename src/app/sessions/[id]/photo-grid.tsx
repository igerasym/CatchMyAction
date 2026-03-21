"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const FindMe = dynamic(() => import("./find-me"), { ssr: false });

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
  purchasedPhotoId?: string;
  bulkPurchasedIds?: string;
}

export default function PhotoGrid({
  sessionId,
  previewBaseUrl,
  initialPhotos,
  initialCursor,
  purchasedPhotoId,
  bulkPurchasedIds,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const userId = (session?.user as any)?.id;

  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [bulkBuying, setBulkBuying] = useState(false);
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [originalUrls, setOriginalUrls] = useState<Record<string, string>>({});
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Load user's purchased photo IDs on mount
  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch("/api/user/purchases").then((r) => r.json()),
      fetch("/api/user/claims?sessionId=" + sessionId).then((r) => r.json()),
    ]).then(([pData, cData]) => {
      if (pData.purchases) {
        const ids = new Set<string>(pData.purchases.map((p: any) => p.id));
        setPurchasedIds(ids);
        const urls: Record<string, string> = {};
        pData.purchases.forEach((p: any) => { urls[p.id] = p.originalUrl; });
        setOriginalUrls(urls);
      }
      if (cData.claims) {
        setMatchedIds(new Set<string>(cData.claims.map((c: any) => c.id)));
      }
    }).catch(() => {});
  }, [userId]);

  // Auto-download after Stripe redirect (once only)
  const downloadTriggered = useRef(false);
  useEffect(() => {
    if (!purchasedPhotoId || !userId || downloadTriggered.current) return;
    downloadTriggered.current = true;

    // Clear the query param so reload doesn't re-trigger
    window.history.replaceState({}, "", window.location.pathname);

    async function verifyAndDownload() {
      // Poll for purchase (webhook may be delayed)
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`/api/photos/${purchasedPhotoId}/verify-purchase?userId=${userId}`);
        const data = await res.json();
        if (data.purchased) {
          setPurchasedIds((prev) => new Set(prev).add(purchasedPhotoId!));
          const dlRes = await fetch(`/api/photos/${purchasedPhotoId}/download?userId=${userId}`);
          const dlData = await dlRes.json();
          if (dlData.downloadUrl) {
            const a = document.createElement("a");
            a.href = dlData.downloadUrl;
            a.download = `photo-${purchasedPhotoId}.jpg`;
            a.click();
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    verifyAndDownload();
  }, [purchasedPhotoId, userId]);

  // Bulk purchase verify after Stripe redirect
  const bulkVerified = useRef(false);
  useEffect(() => {
    if (!bulkPurchasedIds || !userId || bulkVerified.current) return;
    bulkVerified.current = true;
    window.history.replaceState({}, "", window.location.pathname);

    const ids = bulkPurchasedIds.split(",");
    async function verify() {
      for (let i = 0; i < 5; i++) {
        const res = await fetch("/api/photos/bulk-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: ids }),
        });
        const data = await res.json();
        if (data.allPurchased) {
          setPurchasedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    verify();
  }, [bulkPurchasedIds, userId]);

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

      // Already purchased — download directly
      if (data.alreadyPurchased) {
        setPurchasedIds((prev) => new Set(prev).add(photo.id));
        const dlRes = await fetch(`/api/photos/${photo.id}/download?userId=${userId}`);
        const dlData = await dlRes.json();
        if (dlData.downloadUrl) window.open(dlData.downloadUrl, "_blank");
        return;
      }

      // Stripe checkout — redirect to Stripe
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // Mock purchase (dev mode) — download directly
      if (data.purchased) {
        setPurchasedIds((prev) => new Set(prev).add(photo.id));
        const dlRes = await fetch(`/api/photos/${photo.id}/download?userId=${userId}`);
        const dlData = await dlRes.json();
        if (dlData.downloadUrl) window.open(dlData.downloadUrl, "_blank");
        return;
      }

      alert(data.error || "Something went wrong");
    } catch {
      alert("Failed to purchase");
    } finally {
      setPurchasing(false);
    }
  }

  // Buy all matched (unpurchased) photos
  async function handleBulkPurchase() {
    if (!userId) { router.push("/login"); return; }
    const toBuy = Array.from(cartIds).filter((id) => !purchasedIds.has(id));
    if (toBuy.length === 0) return;
    setBulkBuying(true);
    try {
      const res = await fetch("/api/photos/bulk-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: toBuy, sessionId }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.purchased || data.alreadyPurchased) {
        setPurchasedIds((prev) => {
          const next = new Set(prev);
          toBuy.forEach((id) => next.add(id));
          return next;
        });
        setCartIds(new Set());
      }
    } catch {
      alert("Purchase failed");
    } finally {
      setBulkBuying(false);
    }
  }

  function toggleCart(photoId: string) {
    setCartIds((prev) => {
      const next = new Set(prev);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      return next;
    });
  }

  const cartTotal = photos
    .filter((p) => cartIds.has(p.id) && !purchasedIds.has(p.id))
    .reduce((sum, p) => sum + p.priceInCents, 0);
  const cartCount = Array.from(cartIds).filter((id) => !purchasedIds.has(id)).length;

  return (
  return (
    <>
      {/* Toolbar: Find Me button */}
      {photos.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <FindMe photos={photos} onMatchesFound={(ids) => {
            setMatchedIds(ids);
            const unpurchased = Array.from(ids).filter((id) => !purchasedIds.has(id));
            setCartIds(new Set(unpurchased));
          }} />
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((photo) => {
          const isOwned = purchasedIds.has(photo.id);
          const isMatched = matchedIds.has(photo.id);
          const isInCart = cartIds.has(photo.id);
          return (
            <div key={photo.id} onClick={() => setSelectedPhoto(photo)}
              className={`relative aspect-[4/3] bg-white/5 rounded-lg overflow-hidden transition-all cursor-pointer ${
                isOwned ? "ring-2 ring-green-500 shadow-lg shadow-green-500/20"
                : isInCart ? "ring-2 ring-green-500/60"
                : isMatched ? "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20"
                : "hover:ring-2 hover:ring-ocean-500"
              }`}>
              <img src={isOwned && originalUrls[photo.id] ? originalUrls[photo.id] : photo.thumbnailUrl}
                alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />

              {/* Checkbox for unpurchased */}
              {!isOwned && (
                <button onClick={(e) => { e.stopPropagation(); toggleCart(photo.id); }}
                  className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border flex items-center justify-center text-xs transition-all z-10 ${
                    isInCart ? "bg-green-500 border-green-500 text-white"
                    : "border-white/40 bg-black/50 text-transparent hover:text-white/50 hover:border-white/60"
                  }`}>✓</button>
              )}

              {/* Badges */}
              {isOwned && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] font-bold rounded">✓ OWNED</div>
              )}
              {isMatched && !isOwned && (
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-purple-500/90 text-white text-[10px] font-bold rounded">IT&apos;S YOU</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sticky purchase bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#111]/95 backdrop-blur-lg border-t border-white/10 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-medium">{cartCount} photo{cartCount > 1 ? "s" : ""} selected</p>
              <p className="text-xs text-white/40">${(cartTotal / 100).toFixed(2)} total</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCartIds(new Set())}
                className="px-4 py-2 text-xs text-white/40 hover:text-white/60 transition-colors">
                Clear
              </button>
              <button onClick={handleBulkPurchase} disabled={bulkBuying}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-all text-sm font-medium">
                {bulkBuying ? "Processing..." : `Buy ${cartCount} Photo${cartCount > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)} role="dialog" aria-modal="true">
          <div className="bg-[#1a1a2e] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={purchasedIds.has(selectedPhoto.id) && originalUrls[selectedPhoto.id]
                  ? originalUrls[selectedPhoto.id] : selectedPhoto.previewUrl}
                alt="" className="w-full rounded-t-xl" />
              <button onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70">
                ✕
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                {purchasedIds.has(selectedPhoto.id) ? (
                  <>
                    <p className="text-sm font-medium text-green-400">✓ Purchased</p>
                    <p className="text-sm text-white/40">{selectedPhoto.width} × {selectedPhoto.height} · Original quality</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-white">${(selectedPhoto.priceInCents / 100).toFixed(2)}</p>
                    <p className="text-sm text-white/40">{selectedPhoto.width} × {selectedPhoto.height} · High-res download</p>
                  </>
                )}
              </div>
              {purchasedIds.has(selectedPhoto.id) ? (
                <button onClick={() => handlePurchase(selectedPhoto)} disabled={purchasing}
                  className="px-6 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50">
                  {purchasing ? "..." : "Download HD"}
                </button>
              ) : (
                <button onClick={() => handlePurchase(selectedPhoto)} disabled={purchasing}
                  className="px-6 py-2.5 rounded-lg bg-ocean-600 text-white hover:bg-ocean-500 transition-colors disabled:opacity-50">
                  {purchasing ? "Processing..." : "Buy & Download"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
