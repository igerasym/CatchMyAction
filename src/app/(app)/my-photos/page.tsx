"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface PurchasedPhoto {
  id: string;
  thumbnailUrl: string;
  originalUrl: string;
  width: number;
  height: number;
  amountInCents: number;
  downloadCount: number;
  purchasedAt: string;
  sessionTitle: string;
  sessionId: string;
  photographerName: string;
}

interface ClaimedPhoto {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  priceInCents: number;
  claimedAt: string;
  sessionTitle: string;
  sessionId: string;
  photographerName: string;
}

export default function MyPhotosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [tab, setTab] = useState<"claimed" | "purchased">("claimed");
  const [purchases, setPurchases] = useState<PurchasedPhoto[]>([]);
  const [claims, setClaims] = useState<ClaimedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PurchasedPhoto | ClaimedPhoto | null>(null);
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
      setPurchases(pData.purchases || []);
      setClaims(cData.claims || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  const purchasedIds = new Set(purchases.map((p) => p.id));

  async function handleDownload(photoId: string) {
    if (!user?.id) return;
    setDownloading(photoId);
    try {
      const res = await fetch(`/api/photos/${photoId}/download?userId=${user.id}`);
      const data = await res.json();
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = `photo-${photoId}.jpg`;
        a.click();
      } else {
        alert(data.error || "Download failed");
      }
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(null);
    }
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
      if (data.alreadyPurchased) {
        handleDownload(photoId);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.purchased) {
        handleDownload(photoId);
      }
    } catch {
      alert("Purchase failed");
    } finally {
      setBuying(null);
    }
  }

  if (status === "loading" || loading) {
    return <p className="text-center py-12 text-white/40">Loading...</p>;
  }

  const currentItems = tab === "purchased" ? purchases : claims;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">My Actions</h1>
      <p className="text-sm text-white/40 mb-4">Photos where you were found and photos you purchased</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button
          onClick={() => setTab("claimed")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            tab === "claimed" ? "bg-purple-500 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/5"
          }`}
        >
          🔍 Found Me ({claims.length})
        </button>
        <button
          onClick={() => setTab("purchased")}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            tab === "purchased" ? "bg-ocean-500 text-white" : "text-white/40 hover:text-white/60 hover:bg-white/5"
          }`}
        >
          💰 Purchased ({purchases.length})
        </button>
      </div>

      {currentItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">{tab === "claimed" ? "🔍" : "🖼️"}</div>
          <p className="text-white/40 mb-4">
            {tab === "claimed" ? "No photos found yet — use Find Me on a session" : "No purchased photos yet"}
          </p>
          <Link href="/sessions"
            className="inline-block px-6 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm">
            Browse Sessions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tab === "claimed" ? (
            claims.map((photo) => (
              <div key={photo.id} className={`bg-white/5 rounded-xl overflow-hidden group ${
                purchasedIds.has(photo.id)
                  ? "border-2 border-green-500/60"
                  : "border-2 border-purple-500/40"
              }`}>
                <button onClick={() => setSelected(photo)} className="block w-full text-left">
                  <div className="aspect-[4/3] overflow-hidden relative">
                    <img src={photo.thumbnailUrl} alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    {purchasedIds.has(photo.id) && (
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-green-500/90 text-white text-[10px] font-bold rounded">OWNED</div>
                    )}
                  </div>
                </button>
                <div className="p-3">
                  <p className="text-sm text-white font-medium truncate">{photo.sessionTitle}</p>
                  <p className="text-xs text-white/30 mb-3">by {photo.photographerName}</p>
                  {purchasedIds.has(photo.id) ? (
                    <button onClick={() => handleDownload(photo.id)} disabled={downloading === photo.id}
                      className="w-full px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-500 disabled:opacity-40 transition-colors">
                      {downloading === photo.id ? "..." : "⬇ Download HD"}
                    </button>
                  ) : (
                    <button onClick={() => handleBuy(photo.id)} disabled={buying === photo.id}
                      className="w-full px-3 py-1.5 bg-ocean-500 text-white text-xs rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                      {buying === photo.id ? "Processing..." : `Buy — $${(photo.priceInCents / 100).toFixed(2)}`}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            purchases.map((photo) => (
              <div key={photo.id} className="bg-white/5 border-2 border-green-500/60 rounded-xl overflow-hidden group">
                <button onClick={() => setSelected(photo)} className="block w-full text-left">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={photo.thumbnailUrl} alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                  </div>
                </button>
                <div className="p-3">
                  <p className="text-sm text-white font-medium truncate">{photo.sessionTitle}</p>
                  <p className="text-xs text-white/30 mb-3">by {photo.photographerName}</p>
                  <button onClick={() => handleDownload(photo.id)} disabled={downloading === photo.id}
                    className="w-full px-3 py-1.5 bg-ocean-500 text-white text-xs rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                    {downloading === photo.id ? "..." : "⬇ Download HD"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)} role="dialog" aria-modal="true">
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)}
              className="absolute -top-10 right-0 text-white/50 hover:text-white text-sm transition-colors" aria-label="Close">
              ✕ Close
            </button>
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <img
                src={"originalUrl" in selected ? selected.originalUrl : selected.previewUrl}
                alt="Photo"
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
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
                {purchasedIds.has(selected.id) ? (
                  <button onClick={() => handleDownload(selected.id)} disabled={downloading === selected.id}
                    className="px-4 py-2 text-xs bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                    {downloading === selected.id ? "..." : "⬇ Download HD"}
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
      )}
    </div>
  );
}
