"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toastError } from "@/lib/toast";
import { ChevronLeft, ChevronRight, Download, ImageIcon, X } from "lucide-react";
import { PageIntro } from "../ui";
import { loginHref } from "@/lib/redirect";

interface MyPhoto {
  id: string;
  thumbnailUrl: string;
  previewUrl?: string;
  originalUrl?: string;
  width: number;
  height: number;
  priceInCents: number;
  sessionTitle: string;
  sessionId: string;
  photographerName: string;
  purchased: boolean;
  claimed: boolean;
}

export default function MyPhotosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [photos, setPhotos] = useState<MyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MyPhoto | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push(loginHref("/my-photos"));
  }, [status, router]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetch("/api/user/purchases").then((r) => r.json()),
      fetch("/api/user/claims").then((r) => r.json()),
    ]).then(([pData, cData]) => {
      const purchaseMap = new Map<string, any>();
      (pData.purchases || []).forEach((p: any) => purchaseMap.set(p.id, p));

      const allPhotos = new Map<string, MyPhoto>();

      // Add purchased photos
      (pData.purchases || []).forEach((p: any) => {
        allPhotos.set(p.id, {
          id: p.id, thumbnailUrl: p.thumbnailUrl, originalUrl: p.originalUrl,
          width: p.width, height: p.height, priceInCents: p.amountInCents,
          sessionTitle: p.sessionTitle, sessionId: p.sessionId,
          photographerName: p.photographerName, purchased: true, claimed: false,
        });
      });

      // Add/merge claimed photos
      (cData.claims || []).forEach((c: any) => {
        const existing = allPhotos.get(c.id);
        if (existing) {
          existing.claimed = true;
        } else {
          allPhotos.set(c.id, {
            id: c.id, thumbnailUrl: c.thumbnailUrl, previewUrl: c.previewUrl,
            width: c.width, height: c.height, priceInCents: c.priceInCents,
            sessionTitle: c.sessionTitle, sessionId: c.sessionId,
            photographerName: c.photographerName, purchased: false, claimed: true,
          });
        }
      });

      setPhotos(Array.from(allPhotos.values()));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  async function handleDownload(photoId: string) {
    setDownloading(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}/download`);
      const data = await res.json();
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = `photo-${photoId}.jpg`;
        a.click();
      }
    } catch { /* */ }
    finally { setDownloading(null); }
  }

  async function handleBuy(photoId: string) {
    if (!user?.id) { router.push(loginHref("/my-photos")); return; }
    setBuying(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}/purchase`, { method: "POST" });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else if (data.purchased || data.alreadyPurchased) handleDownload(photoId);
      else toastError(data.error || "Purchase failed");
    } catch { toastError("Purchase failed"); }
    finally { setBuying(null); }
  }

  async function handleUnclaim(photoId: string) {
    await fetch("/api/photos/unclaim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId }),
    });
    setPhotos((prev) => prev.filter((p) => !(p.id === photoId && !p.purchased)));
  }

  if (status === "loading" || loading) {
    return (
      <div className="max-w-6xl mx-auto py-4 md:py-8" role="status" aria-label="Loading your photos">
        <div className="h-4 w-32 bg-char-2 animate-pulse mb-5" />
        <div className="h-12 w-72 bg-char-2 animate-pulse mb-10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/3] bg-char-2 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-8">
      <PageIntro kicker="You / Library" title="My actions" className="mb-10">
        Photos you purchased and where you were found
      </PageIntro>

      {photos.length === 0 ? (
        <div className="border-t border-line py-16">
          <div className="w-16 h-16 border border-line bg-char-2 flex items-center justify-center mb-6">
            <ImageIcon className="w-8 h-8 text-bone" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <p className="text-bone font-bold mb-2">No photos yet</p>
          <p className="text-sm text-mute mb-8">Use Find Me on a session or buy photos to see them here</p>
          <Link href="/sessions" className="btn-pri">
            Browse sessions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-1.5 gap-y-6 border-t border-line pt-6">
          {photos.map((photo) => (
            <div key={photo.id} className="group">
              <button type="button" onClick={() => setSelected(photo)}
                aria-label={`Open photo from ${photo.sessionTitle}`}
                className="block w-full text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-bone">
                <div className="aspect-[4/3] overflow-hidden relative bg-char-3">
                  <img src={photo.purchased && photo.originalUrl ? photo.originalUrl : photo.thumbnailUrl}
                    alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                  <span className={`brk brk-sm ${!photo.purchased && photo.claimed ? "brk-rec" : "brk-hover"}`} aria-hidden="true" />
                  {photo.purchased && (
                    <div className="absolute top-2 right-2 tag-ghost">OWNED</div>
                  )}
                  {!photo.purchased && photo.claimed && (
                    <div className="absolute top-2 right-2 tag-rec">IT&apos;S YOU</div>
                  )}
                </div>
              </button>
              <div className="pt-3">
                <p className="text-sm text-bone font-bold truncate">{photo.sessionTitle}</p>
                <p className="font-mono text-[11px] tracking-[0.06em] text-dim mb-3 truncate">by {photo.photographerName}</p>
                {photo.purchased ? (
                  <button onClick={() => handleDownload(photo.id)} disabled={downloading === photo.id}
                    className="btn-pri w-full justify-center gap-2 py-2.5 px-3 text-xs disabled:opacity-40">
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    {downloading === photo.id ? "..." : "Download HD"}
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => handleBuy(photo.id)} disabled={buying === photo.id}
                      className="btn-rec flex-1 justify-center py-2.5 px-3 text-xs disabled:opacity-40">
                      {buying === photo.id ? "..." : `Buy $${(photo.priceInCents / 100).toFixed(2)}`}
                    </button>
                    {photo.claimed && (
                      <button onClick={() => handleUnclaim(photo.id)}
                        className="px-2.5 border border-line text-dim hover:text-rec hover:border-rec transition-colors"
                        title="Remove" aria-label={`Not me: remove photo from ${photo.sessionTitle}`}>
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selected && (() => {
        const currentIndex = photos.findIndex((p) => p.id === selected.id);
        const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
        const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;
        return (
        <div className="fixed inset-0 bg-ink/95 z-50 flex items-center justify-center p-4 outline-none"
          onClick={() => setSelected(null)} role="dialog" aria-modal="true" aria-label={`Photo from ${selected.sessionTitle}`}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" && prevPhoto) setSelected(prevPhoto);
            if (e.key === "ArrowRight" && nextPhoto) setSelected(nextPhoto);
            if (e.key === "Escape") setSelected(null);
          }}
          tabIndex={0} ref={(el) => el?.focus()}>

          {prevPhoto && (
            <button onClick={(e) => { e.stopPropagation(); setSelected(prevPhoto); }} aria-label="Previous photo"
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-ink/80 border border-line text-bone flex items-center justify-center hover:border-bone transition-colors">
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          {nextPhoto && (
            <button onClick={(e) => { e.stopPropagation(); setSelected(nextPhoto); }} aria-label="Next photo"
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-ink/80 border border-line text-bone flex items-center justify-center hover:border-bone transition-colors">
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="hud">{String(currentIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span>
              <button onClick={() => setSelected(null)}
                className="hud inline-flex items-center gap-1.5 hover:text-bone transition-colors">
                <X className="w-3.5 h-3.5" aria-hidden="true" /> Close
              </button>
            </div>
            <div className="relative flex-1 min-h-0 flex items-center justify-center">
              <img src={selected.purchased && selected.originalUrl ? selected.originalUrl : (selected.previewUrl || selected.thumbnailUrl)}
                alt={`Photo from ${selected.sessionTitle} by ${selected.photographerName}`} className="max-w-full max-h-[75vh] object-contain" />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 items-center justify-between bg-char-2 border border-line px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm text-bone font-bold truncate">{selected.sessionTitle}</p>
                <p className="font-mono text-[11px] tracking-[0.06em] text-dim">by {selected.photographerName}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/sessions/${selected.sessionId}`} className="btn-sec py-2.5 px-4 text-xs">
                  View session
                </Link>
                {selected.purchased ? (
                  <button onClick={() => handleDownload(selected.id)} disabled={downloading === selected.id}
                    className="btn-pri py-2.5 px-4 text-xs disabled:opacity-40">
                    {downloading === selected.id ? "..." : "Download HD"}
                  </button>
                ) : (
                  <button onClick={() => handleBuy(selected.id)} disabled={buying === selected.id}
                    className="btn-rec py-2.5 px-4 text-xs disabled:opacity-40">
                    {buying === selected.id ? "..." : "Buy photo"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
