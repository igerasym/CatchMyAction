"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { toastError } from "@/lib/toast";

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
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ count: number; downloadUrl?: string } | null>(null);
  const [reportingPhoto, setReportingPhoto] = useState<string | null>(null);
  const [reportEmail, setReportEmail] = useState("");
  const [reportReason, setReportReason] = useState("thats_me");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

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
          const dlRes = await fetch(`/api/photos/${purchasedPhotoId}/download`);
          const dlData = await dlRes.json();
          if (dlData.downloadUrl) {
            setPurchaseSuccess({ count: 1, downloadUrl: dlData.downloadUrl });
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
          setPurchaseSuccess({ count: ids.length });
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

  async function handleFreeDownload(photo: Photo) {
    if (!userId) { router.push("/login"); return; }
    setPurchasing(true);
    try {
      // Create a free "purchase" record
      const res = await fetch(`/api/photos/${photo.id}/free-download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.downloadUrl) {
        setPurchasedIds((prev) => new Set(prev).add(photo.id));
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = `photo-${photo.id}.jpg`;
        a.click();
      } else if (data.error) {
        toastError(data.error);
      }
    } catch {
      toastError("Download failed");
    } finally {
      setPurchasing(false);
    }
  }

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
        const dlRes = await fetch(`/api/photos/${photo.id}/download`);
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
        const dlRes = await fetch(`/api/photos/${photo.id}/download`);
        const dlData = await dlRes.json();
        if (dlData.downloadUrl) window.open(dlData.downloadUrl, "_blank");
        return;
      }

      toastError(data.error || "Something went wrong");
    } catch {
      toastError("Failed to purchase");
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
      toastError("Purchase failed");
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

  async function handleReport() {
    if (!reportingPhoto || !reportEmail) return;
    setReportLoading(true);
    try {
      await fetch("/api/photos/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: reportingPhoto, email: reportEmail, reason: reportReason, details: reportDetails }),
      });
      setReportSent(true);
    } catch { /* */ }
    finally { setReportLoading(false); }
  }

  function openReport(photoId: string) {
    setReportingPhoto(photoId);
    setReportSent(false);
    setReportEmail(session?.user?.email || "");
    setReportReason("thats_me");
    setReportDetails("");
  }

  const cartTotal = photos
    .filter((p) => cartIds.has(p.id) && !purchasedIds.has(p.id))
    .reduce((sum, p) => sum + p.priceInCents, 0);
  const cartCount = Array.from(cartIds).filter((id) => !purchasedIds.has(id)).length;

  return (
    <>
      {/* Purchase success banner */}
      {purchaseSuccess && (
        <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-lg">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {purchaseSuccess.count === 1 ? "Photo purchased!" : `${purchaseSuccess.count} photos purchased!`}
              </p>
              <p className="text-xs text-white/40">
                {purchaseSuccess.downloadUrl ? "Your download should start automatically." : "Photos are now in My Actions."}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {purchaseSuccess.downloadUrl && (
              <a href={purchaseSuccess.downloadUrl} download
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-xs">
                Download Again
              </a>
            )}
            <button onClick={() => setPurchaseSuccess(null)}
              className="px-3 py-1.5 border border-white/10 text-white/50 rounded-lg hover:bg-white/5 transition-colors text-xs">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Find Me button */}
      {photos.length > 0 && (
        <div className="flex items-center justify-end mb-4">
          <FindMe sessionId={sessionId} photos={photos} onMatchFound={(ids) => {
            console.log("Find Me matched:", ids);
            setMatchedIds(new Set(ids));
            const unpurchased = ids.filter((id: string) => !purchasedIds.has(id));
            setCartIds(new Set(unpurchased));
            // Scroll to first matched photo
            setTimeout(() => {
              const el = document.querySelector('[data-matched="true"]');
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
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
              data-matched={isMatched ? "true" : undefined}
              className={`relative aspect-[4/3] bg-white/5 rounded-lg overflow-hidden transition-all cursor-pointer ${
                isOwned ? "ring-2 ring-green-500 shadow-lg shadow-green-500/20"
                : isInCart ? "ring-2 ring-green-500/60"
                : isMatched ? "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20"
                : "hover:ring-2 hover:ring-ocean-500"
              }`}>
              <img src={photo.thumbnailUrl}
                alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" crossOrigin="anonymous" />

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
              <p className="text-xs text-white/40">{cartTotal === 0 ? "Free" : `$${(cartTotal / 100).toFixed(2)} total`}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCartIds(new Set())}
                className="px-4 py-2 text-xs text-white/40 hover:text-white/60 transition-colors">
                Clear
              </button>
              <button onClick={handleBulkPurchase} disabled={bulkBuying}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 transition-all text-sm font-medium">
                {bulkBuying ? "Processing..." : cartTotal === 0 ? `Download ${cartCount} Free` : `Buy ${cartCount} Photo${cartCount > 1 ? "s" : ""}`}
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
      {selectedPhoto && (() => {
        const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
        const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
        const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;
        return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)} role="dialog" aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" && prevPhoto) setSelectedPhoto(prevPhoto);
            if (e.key === "ArrowRight" && nextPhoto) setSelectedPhoto(nextPhoto);
            if (e.key === "Escape") setSelectedPhoto(null);
          }}
          tabIndex={0}
          ref={(el) => el?.focus()}
        >
          {/* Prev button */}
          {prevPhoto && (
            <button onClick={(e) => { e.stopPropagation(); setSelectedPhoto(prevPhoto); }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {/* Next button */}
          {nextPhoto && (
            <button onClick={(e) => { e.stopPropagation(); setSelectedPhoto(nextPhoto); }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}

          <div className="bg-[#1a1a2e] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={selectedPhoto.previewUrl}
                alt="" className="w-full rounded-t-xl" crossOrigin="anonymous" />
              <button onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70">
                ✕
              </button>
              {/* Photo counter */}
              <div className="absolute bottom-3 left-3 bg-black/50 text-white/70 text-xs px-2 py-1 rounded">
                {currentIndex + 1} / {photos.length}
              </div>
            </div>
            <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                {purchasedIds.has(selectedPhoto.id) ? (
                  <>
                    <p className="text-sm font-medium text-green-400">✓ Purchased</p>
                    <p className="text-sm text-white/40">{selectedPhoto.width} × {selectedPhoto.height} · Original quality</p>
                  </>
                ) : selectedPhoto.priceInCents === 0 ? (
                  <>
                    <p className="text-lg font-semibold text-green-400">Free</p>
                    <p className="text-sm text-white/40">{selectedPhoto.width} × {selectedPhoto.height} · High-res download</p>
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
              ) : selectedPhoto.priceInCents === 0 ? (
                <button onClick={() => handleFreeDownload(selectedPhoto)} disabled={purchasing}
                  className="px-6 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-50">
                  {purchasing ? "..." : "Free Download"}
                </button>
              ) : (
                <button onClick={() => handlePurchase(selectedPhoto)} disabled={purchasing}
                  className="px-6 py-2.5 rounded-lg bg-ocean-600 text-white hover:bg-ocean-500 transition-colors disabled:opacity-50">
                  {purchasing ? "Processing..." : "Buy & Download"}
                </button>
              )}
            </div>
            <div className="px-4 pb-3">
              <button onClick={() => { openReport(selectedPhoto.id); setSelectedPhoto(null); }}
                className="text-xs text-white/20 hover:text-white/40 transition-colors">
                Report this photo
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Report modal */}
      {reportingPhoto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setReportingPhoto(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            {reportSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-400 text-xl">✓</span>
                </div>
                <p className="text-white font-medium mb-1">Report submitted</p>
                <p className="text-sm text-white/40 mb-4">We&apos;ll review this within 48 hours and notify you by email.</p>
                <button onClick={() => setReportingPhoto(null)} className="px-4 py-2 bg-ocean-500 text-white rounded-lg text-sm">Close</button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-white mb-1">Report Photo</h2>
                <p className="text-sm text-white/40 mb-4">Request removal of this photo from the platform.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Reason</label>
                    <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                      <option value="thats_me">That&apos;s me — I want my photo removed</option>
                      <option value="inappropriate">Inappropriate content</option>
                      <option value="copyright">Copyright violation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Your email</label>
                    <input type="email" value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} required
                      placeholder="your@email.com" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/25" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 mb-1">Details (optional)</label>
                    <textarea value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} rows={2}
                      placeholder="Any additional context..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/25" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setReportingPhoto(null)} className="flex-1 py-2 border border-white/10 text-white/50 rounded-lg text-sm hover:bg-white/5">Cancel</button>
                    <button onClick={handleReport} disabled={reportLoading || !reportEmail}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-500 disabled:opacity-40">
                      {reportLoading ? "..." : "Submit Report"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
