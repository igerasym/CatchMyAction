"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { toastError } from "@/lib/toast";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Download, Flag, Loader2, Plus, X } from "lucide-react";
import { loginHref } from "@/lib/redirect";

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
  /** Used for photo alt text only */
  sessionTitle?: string;
  previewBaseUrl: string;
  initialPhotos: Photo[];
  initialCursor: string | null;
  purchasedPhotoId?: string;
  bulkPurchasedIds?: string;
  autoFindMe?: boolean;
}

export default function PhotoGrid({
  sessionId,
  sessionTitle = "this session",
  previewBaseUrl,
  initialPhotos,
  initialCursor,
  purchasedPhotoId,
  bulkPurchasedIds,
  autoFindMe,
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
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ count: number; downloadUrl?: string; downloaded?: boolean } | null>(null);
  // Post-checkout status: confirming → success | slow (webhook late) · cancelled (came back from Stripe without paying)
  const [payState, setPayState] = useState<"confirming" | "slow" | "cancelled" | null>(null);
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

    // Read the Stripe checkout id, then clear the query so reload doesn't re-trigger
    const cs = new URLSearchParams(window.location.search).get("cs") || "";
    window.history.replaceState({}, "", window.location.pathname);

    async function verifyAndDownload() {
      setPayState("confirming");
      // Poll for purchase (webhook may be delayed)
      for (let i = 0; i < 10; i++) {
        const res = await fetch(`/api/photos/${purchasedPhotoId}/verify-purchase?cs=${encodeURIComponent(cs)}`);
        const data = await res.json();
        if (data.purchased) {
          setPurchasedIds((prev) => new Set(prev).add(purchasedPhotoId!));
          const dlRes = await fetch(`/api/photos/${purchasedPhotoId}/download`);
          const dlData = await dlRes.json();
          setPayState(null);
          clearSavedCart();
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
      setPayState("slow");
    }

    verifyAndDownload();
  }, [purchasedPhotoId, userId]);

  // Bulk purchase verify after Stripe redirect
  const bulkVerified = useRef(false);
  useEffect(() => {
    if (!bulkPurchasedIds || !userId || bulkVerified.current) return;
    bulkVerified.current = true;
    const cs = new URLSearchParams(window.location.search).get("cs") || "";
    window.history.replaceState({}, "", window.location.pathname);
    if (!cs) return;

    async function verify() {
      setPayState("confirming");
      for (let i = 0; i < 10; i++) {
        const res = await fetch("/api/photos/bulk-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cs }),
        });
        const data = await res.json();
        const ids: string[] = data.purchasedIds || [];
        if (data.allPurchased && ids.length > 0) {
          setPurchasedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.add(id));
            return next;
          });
          setPurchaseSuccess({ count: ids.length });
          setPayState(null);
          setCartIds(new Set());
          clearSavedCart();
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      setPayState("slow");
    }
    verify();
  }, [bulkPurchasedIds, userId]);

  // Cart survives the login redirect and a cancelled Stripe checkout (per session, this tab only)
  const cartKey = `cma-cart-${sessionId}`;
  function clearSavedCart() {
    try { sessionStorage.removeItem(cartKey); } catch {}
  }
  const cartRestored = useRef(false);
  useEffect(() => {
    if (cartRestored.current) return;
    cartRestored.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(cartKey) || "[]");
      if (Array.isArray(saved) && saved.length) setCartIds(new Set(saved.filter((x) => typeof x === "string")));
    } catch {}
    const q = new URLSearchParams(window.location.search);
    if (q.get("cancelled") === "1") {
      setPayState("cancelled");
      q.delete("cancelled");
      const rest = q.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!cartRestored.current) return;
    try {
      if (cartIds.size) sessionStorage.setItem(cartKey, JSON.stringify(Array.from(cartIds)));
      else sessionStorage.removeItem(cartKey);
    } catch {}
  }, [cartIds, cartKey]);

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
    if (!userId) { router.push(loginHref(window.location.pathname)); return; }
    setPurchasing(true);
    try {
      // Create a free "purchase" record
      const res = await fetch(`/api/photos/${photo.id}/free-download`, { method: "POST" });
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
      router.push(loginHref(window.location.pathname));
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch(`/api/photos/${photo.id}/purchase`, { method: "POST" });
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
    if (!userId) { router.push(loginHref(window.location.pathname)); return; }
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
        clearSavedCart();
        // Free photos (or already owned): actually download them, not just mark them as owned
        const done = await downloadPhotos(toBuy);
        setPurchaseSuccess({ count: done, downloaded: true });
      } else {
        toastError(data.error || "Purchase failed");
      }
    } catch {
      toastError("Purchase failed");
    } finally {
      setBulkBuying(false);
    }
  }

  /** Download owned photos one after another (browsers may ask once to allow multiple downloads). */
  async function downloadPhotos(ids: string[]): Promise<number> {
    let done = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/photos/${id}/download`);
        const d = await res.json();
        if (!d.downloadUrl) continue;
        const a = document.createElement("a");
        a.href = d.downloadUrl;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
        done++;
        await new Promise((r) => setTimeout(r, 700));
      } catch {}
    }
    if (done < ids.length) toastError(`${ids.length - done} photo(s) didn't download — get them in My Actions.`);
    return done;
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

  // Presentation-only derived values
  const fmtPrice = (cents: number) => (cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`);
  const minPrice = photos.length > 0 ? Math.min(...photos.map((p) => p.priceInCents)) : 0;
  const cartPhotos = photos.filter((p) => cartIds.has(p.id) && !purchasedIds.has(p.id));
  const matchedCount = photos.filter((p) => matchedIds.has(p.id)).length;

  return (
    <>
      {/* Checkout status */}
      {payState && (
        <div
          role="status"
          aria-live="polite"
          className="relative mb-6 p-5 bg-ink flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <span aria-hidden="true" className="brk brk-soft brk-sm" />
          <div className="flex items-center gap-4">
            <span className={`rec-dot shrink-0 ${payState === "confirming" ? "blink" : ""}`} aria-hidden="true" />
            <div>
              <p className="disp text-[20px] text-bone">
                {payState === "confirming" && "Confirming your payment…"}
                {payState === "slow" && "Payment received — still processing"}
                {payState === "cancelled" && "Payment cancelled"}
              </p>
              <p className="text-sm text-mute mt-1">
                {payState === "confirming" && "This usually takes a few seconds. Don't close the page."}
                {payState === "slow" && "It's taking longer than usual. Your photos will appear in My Actions within a minute."}
                {payState === "cancelled" && "No charge was made. Your selection is still here."}
              </p>
            </div>
          </div>
          {payState !== "confirming" && (
            <div className="flex gap-2 shrink-0">
              {payState === "slow" && (
                <a href="/my-photos" className="btn-pri !py-2.5 !px-4 !text-sm">Open My Actions</a>
              )}
              <button onClick={() => setPayState(null)} className="btn-sec !py-2.5 !px-4 !text-sm">Dismiss</button>
            </div>
          )}
        </div>
      )}

      {/* Purchase success banner */}
      {purchaseSuccess && (
        <div role="status" className="relative mb-6 p-5 bg-ink flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <span aria-hidden="true" className="brk brk-rec brk-sm" />
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 grid place-items-center bg-rec text-rec-ink shrink-0">
              <Check className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
            </div>
            <div>
              <p className="disp text-[22px] text-bone">
                {purchaseSuccess.downloaded
                  ? `${purchaseSuccess.count} ${purchaseSuccess.count === 1 ? "photo" : "photos"} downloaded`
                  : purchaseSuccess.count === 1 ? "Photo purchased" : `${purchaseSuccess.count} photos purchased`}
                <span className="text-rec">.</span>
              </p>
              <p className="text-sm text-mute mt-1">
                {purchaseSuccess.downloaded
                  ? "Check your downloads folder. They're also saved in My Actions."
                  : purchaseSuccess.downloadUrl ? "Your download should start automatically." : "Photos are now in My Actions."}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {!purchaseSuccess.downloadUrl && (
              <a href="/my-photos" className="btn-pri !py-2.5 !px-4 !text-sm !gap-2">
                <Download className="w-4 h-4" aria-hidden="true" /> {purchaseSuccess.downloaded ? "Open My Actions" : "Download in My Actions"}
              </a>
            )}
            {purchaseSuccess.downloadUrl && (
              <a href={purchaseSuccess.downloadUrl} download
                className="btn-pri !py-2.5 !px-4 !text-sm !gap-2">
                <Download className="w-4 h-4" aria-hidden="true" /> Download again
              </a>
            )}
            <button onClick={() => setPurchaseSuccess(null)}
              className="btn-sec !py-2.5 !px-4 !text-sm">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Find Me — the one big action */}
      {photos.length > 0 && (
        <div className="mb-10 px-1.5">
          <FindMe sessionId={sessionId} photos={photos} autoOpen={autoFindMe} onMatchFound={(ids) => {
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

      {/* Grid header */}
      {photos.length > 0 && (
        <div className="flex items-end justify-between gap-4 pb-3 mb-3 border-b border-line">
          <div>
            <p className="hud">All frames · {photos.length}{cursor ? "+" : ""}</p>
            {matchedCount > 0 && (
              <p className="font-mono text-[11.5px] font-bold tracking-[0.14em] uppercase text-rec mt-1.5 flex items-center gap-2">
                <span className="rec-dot !w-1.5 !h-1.5" aria-hidden="true" />
                It&apos;s you · {matchedCount}
              </p>
            )}
          </div>
          <p className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-bone">
            {minPrice === 0 ? "Free" : <><span className="text-dim">From</span> {fmtPrice(minPrice)}</>}
          </p>
        </div>
      )}

      {/* Photo grid */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2" aria-label={`Photos from ${sessionTitle}`}>
        {photos.map((photo, index) => {
          const isOwned = purchasedIds.has(photo.id);
          const isMatched = matchedIds.has(photo.id);
          const isInCart = cartIds.has(photo.id);
          const label = `Photo ${index + 1} from ${sessionTitle}`;
          return (
            <li key={photo.id}
              data-matched={isMatched ? "true" : undefined}
              className="group relative aspect-[4/5] bg-char-2 overflow-hidden">
              <button type="button" onClick={() => setSelectedPhoto(photo)}
                aria-label={`Open ${label}${isMatched ? " (it's you)" : ""}${isOwned ? " (owned)" : ""}`}
                className="absolute inset-0 w-full h-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bone">
                <img src={photo.thumbnailUrl}
                  alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" decoding="async" />
              </button>

              {/* Frame: matched = REC brackets, otherwise brackets on hover */}
              {isMatched ? (
                <span aria-hidden="true" className="brk brk-rec brk-sm" style={{ inset: "6px" }} />
              ) : (
                <span aria-hidden="true" className="brk brk-sm brk-hover" />
              )}

              {/* Badges */}
              {isMatched && (
                <span className="tag-rec absolute top-2 left-2 pointer-events-none">IT&apos;S YOU</span>
              )}
              {isOwned ? (
                <span className="tag-ghost absolute top-2 right-2 pointer-events-none inline-flex items-center gap-1">
                  <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" /> OWNED
                </span>
              ) : (
                /* Cart checkbox for unpurchased — 40px touch target */
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleCart(photo.id); }}
                  role="checkbox" aria-checked={isInCart}
                  aria-label={`${isInCart ? "Remove" : "Add"} photo ${index + 1} ${isInCart ? "from" : "to"} cart`}
                  className="absolute top-0 right-0 w-10 h-10 grid place-items-center z-10">
                  <span aria-hidden="true" className={`w-7 h-7 grid place-items-center transition-colors ${
                    isInCart ? "bg-rec text-rec-ink"
                    : "bg-ink/60 text-bone shadow-[inset_0_0_0_2px_#f2ede4] hover:bg-ink/80"
                  }`}>
                    {isInCart ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
                  </span>
                </button>
              )}

              {/* Price */}
              {!isOwned && (
                <span className="tag-ghost absolute bottom-2 left-2 pointer-events-none !text-[12px] font-semibold">
                  {fmtPrice(photo.priceInCents)}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Sticky purchase bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-4 pt-6 pb-[max(12px,env(safe-area-inset-bottom))]"
          style={{ background: "linear-gradient(0deg, #1a1b1e 65%, rgba(26,27,30,0))" }}>
          <div className="max-w-5xl mx-auto flex items-center gap-3 p-2.5 pl-3 bg-bone text-ink" aria-live="polite">
            <div className="hidden min-[360px]:flex -space-x-3 shrink-0" aria-hidden="true">
              {cartPhotos.slice(0, 3).map((p) => (
                <img key={p.id} src={p.thumbnailUrl} alt=""
                  className="w-10 h-10 object-cover ring-2 ring-bone" />
              ))}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-[15px] font-extrabold truncate">
                {cartCount} photo{cartCount > 1 ? "s" : ""} · {cartTotal === 0 ? "Free" : `$${(cartTotal / 100).toFixed(2)}`}
              </p>
              <button onClick={() => setCartIds(new Set())}
                className="text-[12px] text-[#4a4740] underline underline-offset-2 hover:text-ink">
                Clear selection
              </button>
            </div>
            <button onClick={handleBulkPurchase} disabled={bulkBuying}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-3 bg-ink text-bone text-[14px] font-bold disabled:opacity-60 transition-colors hover:bg-char-3">
              {bulkBuying ? "Processing…" : cartTotal === 0 ? `Download ${cartCount} free` : "Checkout"}
              {!bulkBuying && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-10 text-center">
        {loading && (
          <div role="status" className="inline-flex items-center gap-2 hud">
            <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
            Loading more photos
          </div>
        )}
        {!cursor && photos.length > 0 && (
          <div className="flex items-center gap-4" aria-hidden="true">
            <span className="ticks flex-1" />
            <span className="hud">End of session</span>
            <span className="ticks flex-1" />
          </div>
        )}
      </div>

      {/* Photo detail modal */}
      {selectedPhoto && (() => {
        const currentIndex = photos.findIndex((p) => p.id === selectedPhoto.id);
        const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
        const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;
        const isSelectedMatched = matchedIds.has(selectedPhoto.id);
        return (
        <div className="fixed inset-0 bg-ink/95 z-50 flex items-center justify-center p-3 sm:p-4 outline-none"
          onClick={() => setSelectedPhoto(null)} role="dialog" aria-modal="true"
          aria-label={`Photo ${currentIndex + 1} of ${photos.length} from ${sessionTitle}`}
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
              aria-label="Previous photo"
              className="absolute left-1 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-ink/70 text-bone grid place-items-center hover:bg-char-3 transition-colors">
              <ChevronLeft className="w-6 h-6" aria-hidden="true" />
            </button>
          )}
          {/* Next button */}
          {nextPhoto && (
            <button onClick={(e) => { e.stopPropagation(); setSelectedPhoto(nextPhoto); }}
              aria-label="Next photo"
              className="absolute right-1 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-ink/70 text-bone grid place-items-center hover:bg-char-3 transition-colors">
              <ChevronRight className="w-6 h-6" aria-hidden="true" />
            </button>
          )}

          <div className="bg-char-2 border border-line max-w-4xl w-full max-h-[92vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-ink">
              <img src={selectedPhoto.previewUrl}
                alt={`Photo ${currentIndex + 1} from ${sessionTitle}`} className="w-full" />
              {isSelectedMatched && (
                <>
                  <span aria-hidden="true" className="brk brk-rec" style={{ inset: "10px" }} />
                  <span className="tag-rec absolute top-4 left-4">IT&apos;S YOU</span>
                </>
              )}
              <button onClick={() => setSelectedPhoto(null)}
                aria-label="Close photo"
                className="absolute top-2 right-2 w-11 h-11 bg-ink/70 text-bone grid place-items-center hover:bg-char-3 transition-colors">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
              {/* Photo counter */}
              <span className="tag-ghost absolute bottom-3 left-3">
                {String(currentIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
              </span>
            </div>
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                {purchasedIds.has(selectedPhoto.id) ? (
                  <>
                    <p className="text-[17px] font-bold text-bone inline-flex items-center gap-2">
                      <Check className="w-4 h-4 text-rec" strokeWidth={3} aria-hidden="true" /> Purchased
                    </p>
                    <p className="hud mt-1">{selectedPhoto.width} × {selectedPhoto.height} · Original quality</p>
                  </>
                ) : selectedPhoto.priceInCents === 0 ? (
                  <>
                    <p className="disp text-[26px] text-bone">Free</p>
                    <p className="hud mt-1">{selectedPhoto.width} × {selectedPhoto.height} · High-res download</p>
                  </>
                ) : (
                  <>
                    <p className="disp text-[26px] text-bone">${(selectedPhoto.priceInCents / 100).toFixed(2)}</p>
                    <p className="hud mt-1">{selectedPhoto.width} × {selectedPhoto.height} · High-res download</p>
                  </>
                )}
              </div>
              {purchasedIds.has(selectedPhoto.id) ? (
                <button onClick={() => handlePurchase(selectedPhoto)} disabled={purchasing}
                  className="btn-pri justify-center disabled:opacity-50">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {purchasing ? "…" : "Download HD"}
                </button>
              ) : selectedPhoto.priceInCents === 0 ? (
                <button onClick={() => handleFreeDownload(selectedPhoto)} disabled={purchasing}
                  className="btn-pri justify-center disabled:opacity-50">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {purchasing ? "…" : "Free download"}
                </button>
              ) : (
                <button onClick={() => handlePurchase(selectedPhoto)} disabled={purchasing}
                  className="btn-rec justify-center disabled:opacity-50">
                  {purchasing ? "Processing…" : "Buy & download"}
                  {!purchasing && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                </button>
              )}
            </div>
            <div className="px-4 sm:px-5 pb-4 border-t border-line pt-3">
              <button onClick={() => { openReport(selectedPhoto.id); setSelectedPhoto(null); }}
                className="inline-flex items-center gap-1.5 text-xs text-dim hover:text-bone transition-colors">
                <Flag className="w-3.5 h-3.5" aria-hidden="true" /> Report this photo
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Report modal */}
      {reportingPhoto && (
        <div className="fixed inset-0 bg-ink/90 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setReportingPhoto(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="report-title"
            className="bg-char-2 border border-line w-full sm:max-w-sm p-6 pb-8 sm:pb-6" onClick={(e) => e.stopPropagation()}>
            {reportSent ? (
              <div className="text-center py-4" role="status">
                <div className="w-12 h-12 grid place-items-center mx-auto mb-4 bg-ink">
                  <Check className="w-6 h-6 text-bone" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <p id="report-title" className="disp text-[24px] text-bone mb-2">Report submitted</p>
                <p className="text-sm text-mute mb-6">We&apos;ll review this within 48 hours and notify you by email.</p>
                <button onClick={() => setReportingPhoto(null)} className="btn-pri !py-3 !text-sm">Close</button>
              </div>
            ) : (
              <>
                <p className="hud mb-2">Removal request</p>
                <h2 id="report-title" className="disp text-[26px] text-bone mb-2">Report photo<span className="text-rec">.</span></h2>
                <p className="text-sm text-mute mb-5">Request removal of this photo from the platform.</p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="report-reason" className="hud block mb-2">Reason</label>
                    <select id="report-reason" value={reportReason} onChange={(e) => setReportReason(e.target.value)}
                      className="w-full bg-ink border border-line text-bone px-3.5 py-3 text-sm focus:border-bone focus:outline-none">
                      <option value="thats_me">That&apos;s me — I want my photo removed</option>
                      <option value="inappropriate">Inappropriate content</option>
                      <option value="copyright">Copyright violation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="report-email" className="hud block mb-2">Your email</label>
                    <input id="report-email" type="email" value={reportEmail} onChange={(e) => setReportEmail(e.target.value)} required
                      placeholder="your@email.com" className="w-full bg-ink border border-line text-bone placeholder:text-dim px-3.5 py-3 text-sm focus:border-bone focus:outline-none" />
                  </div>
                  <div>
                    <label htmlFor="report-details" className="hud block mb-2">Details (optional)</label>
                    <textarea id="report-details" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} rows={2}
                      placeholder="Any additional context…" className="w-full bg-ink border border-line text-bone placeholder:text-dim px-3.5 py-3 text-sm focus:border-bone focus:outline-none" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setReportingPhoto(null)} className="btn-sec flex-1 justify-center !py-3 !text-sm">Cancel</button>
                    <button onClick={handleReport} disabled={reportLoading || !reportEmail}
                      className="btn-rec flex-1 justify-center !py-3 !text-sm disabled:opacity-50">
                      {reportLoading ? "Sending…" : "Submit report"}
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
