"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface PurchasedPhoto {
  id: string;
  purchaseId: string;
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

export default function MyPhotosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [photos, setPhotos] = useState<PurchasedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PurchasedPhoto | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/user/purchases")
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data.purchases || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  async function handleDownload(photo: PurchasedPhoto) {
    setDownloading(photo.id);
    try {
      const res = await fetch(`/api/photos/${photo.id}/download?userId=${user.id}`);
      const data = await res.json();
      if (data.downloadUrl) {
        const a = document.createElement("a");
        a.href = data.downloadUrl;
        a.download = `photo-${photo.id}.jpg`;
        a.click();
        setPhotos((prev) =>
          prev.map((p) => p.id === photo.id ? { ...p, downloadCount: p.downloadCount + 1 } : p)
        );
      }
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(null);
    }
  }

  if (status === "loading" || loading) {
    return <p className="text-center py-12 text-white/40">Loading...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">My Actions</h1>
      <p className="text-sm text-white/40 mb-6">Your purchased photos — download anytime</p>

      {photos.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🖼️</div>
          <p className="text-white/40 mb-4">No purchased photos yet</p>
          <Link href="/sessions"
            className="inline-block px-6 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm">
            Browse Sessions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
              <button onClick={() => setSelected(photo)} className="block w-full text-left">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={photo.thumbnailUrl} alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                </div>
              </button>
              <div className="p-3">
                <p className="text-sm text-white font-medium truncate">{photo.sessionTitle}</p>
                <p className="text-xs text-white/30 mb-3">by {photo.photographerName}</p>
                <button onClick={() => handleDownload(photo)} disabled={downloading === photo.id}
                  className="w-full px-3 py-1.5 bg-ocean-500 text-white text-xs rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                  {downloading === photo.id ? "Downloading..." : "⬇ Download HD"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox — original photo without watermark */}
      {selected && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)} role="dialog" aria-modal="true">
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button onClick={() => setSelected(null)}
              className="absolute -top-10 right-0 text-white/50 hover:text-white text-sm transition-colors" aria-label="Close">
              ✕ Close
            </button>

            {/* Image */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <img src={selected.originalUrl} alt="Purchased photo"
                className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>

            {/* Info bar */}
            <div className="mt-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-3">
              <div>
                <p className="text-sm text-white font-medium">{selected.sessionTitle}</p>
                <p className="text-xs text-white/30">
                  by {selected.photographerName} · {selected.width}×{selected.height}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/sessions/${selected.sessionId}`}
                  className="px-4 py-2 text-xs border border-white/10 text-white/50 rounded-lg hover:bg-white/5 transition-colors">
                  View Session
                </Link>
                <button onClick={() => handleDownload(selected)} disabled={downloading === selected.id}
                  className="px-4 py-2 text-xs bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                  {downloading === selected.id ? "..." : "⬇ Download HD"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
