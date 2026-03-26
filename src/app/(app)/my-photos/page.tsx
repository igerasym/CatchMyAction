"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

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
    if (status === "unauthenticated") router.push("/login");
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
    if (!user?.id) { router.push("/login"); return; }
    setBuying(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else if (data.purchased || data.alreadyPurchased) handleDownload(photoId);
    } catch { alert("Purchase failed"); }
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
    return <p className="text-center py-12 text-white/40">Loading...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">My Actions</h1>
      <p className="text-sm text-white/40 mb-6">Photos you purchased and where you were found</p>

      {photos.length === 0 ? (
        <div className="text-center py-16">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-ocean-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><circle cx="8.5" cy="10.5" r="2" /><path d="M2 16l5-4 3 3 4-5 8 6" />
              </svg>
            </div>
          </div>
          <p className="text-white/40 mb-4">No photos yet</p>
          <p className="text-xs text-white/20 mb-4">Use Find Me on a session or buy photos to see them here</p>
          <Link href="/sessions"
            className="inline-block px-6 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm">
            Browse Sessions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className={`bg-white/5 rounded-xl overflow-hidden group ${
              photo.purchased ? "border-2 border-green-500/50" : "border-2 border-purple-500/30"
            }`}>
              <div onClick={() => setSelected(photo)} className="cursor-pointer">
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img src={photo.purchased && photo.originalUrl ? photo.originalUrl : photo.thumbnailUrl}
                    alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  {photo.purchased && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] font-bold rounded">OWNED</div>
                  )}
                  {!photo.purchased && photo.claimed && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-purple-500/90 text-white text-[10px] font-bold rounded">IT'S YOU</div>
                  )}
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-white font-medium truncate">{photo.sessionTitle}</p>
                <p className="text-xs text-white/30 mb-2">by {photo.photographerName}</p>
                {photo.purchased ? (
                  <button onClick={() => handleDownload(photo.id)} disabled={downloading === photo.id}
                    className="w-full px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-500 disabled:opacity-40 transition-colors">
                    {downloading === photo.id ? "..." : "Download HD"}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => handleBuy(photo.id)} disabled={buying === photo.id}
                      className="flex-1 px-3 py-1.5 bg-ocean-500 text-white text-xs rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                      {buying === photo.id ? "..." : `Buy $${(photo.priceInCents / 100).toFixed(2)}`}
                    </button>
                    {photo.claimed && (
                      <button onClick={() => handleUnclaim(photo.id)}
                        className="px-2 py-1.5 border border-red-500/20 text-red-400/50 text-xs rounded-lg hover:bg-red-500/10 transition-colors" title="Remove">
                        ✕
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
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)} role="dialog" aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" && prevPhoto) setSelected(prevPhoto);
            if (e.key === "ArrowRight" && nextPhoto) setSelected(nextPhoto);
            if (e.key === "Escape") setSelected(null);
          }}
          tabIndex={0} ref={(el) => el?.focus()}>

          {prevPhoto && (
            <button onClick={(e) => { e.stopPropagation(); setSelected(prevPhoto); }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {nextPhoto && (
            <button onClick={(e) => { e.stopPropagation(); setSelected(nextPhoto); }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}

          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/30">{currentIndex + 1} / {photos.length}</span>
              <button onClick={() => setSelected(null)}
                className="text-white/50 hover:text-white text-sm transition-colors">✕ Close</button>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <img src={selected.purchased && selected.originalUrl ? selected.originalUrl : (selected.previewUrl || selected.thumbnailUrl)}
                alt="" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
            <div className="mt-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-3">
              <div>
                <p className="text-sm text-white font-medium">{selected.sessionTitle}</p>
                <p className="text-xs text-white/30">by {selected.photographerName}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/sessions/${selected.sessionId}`}
                  className="px-4 py-2 text-xs border border-white/10 text-white/50 rounded-lg hover:bg-white/5 transition-colors">
                  View Session
                </Link>
                {selected.purchased ? (
                  <button onClick={() => handleDownload(selected.id)} disabled={downloading === selected.id}
                    className="px-4 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-40 transition-colors">
                    {downloading === selected.id ? "..." : "Download HD"}
                  </button>
                ) : (
                  <button onClick={() => handleBuy(selected.id)} disabled={buying === selected.id}
                    className="px-4 py-2 text-xs bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                    {buying === selected.id ? "..." : "Buy Photo"}
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
