"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Photo {
  id: string;
  thumbnailKey: string;
  width: number;
  height: number;
  createdAt: string;
}

interface SessionData {
  id: string;
  title: string;
  location: string;
  photoCount: number;
  published: boolean;
  coverPhotoId: string | null;
}

export default function ManagePhotosPage() {
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;
  const user = authSession?.user as any;

  const [session, setSession] = useState<SessionData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [showQR, setShowQR] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([
      fetch(`/api/sessions/${sessionId}`).then((r) => r.json()),
      fetch(`/api/sessions/${sessionId}/photos?limit=500`).then((r) => r.json()),
    ]).then(([sess, data]) => {
      setSession(sess);
      setPhotos(data.photos || []);
      setLoading(false);
    });
  }, [sessionId]);

  // --- Selection ---
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id)));
  }

  // --- Delete ---
  async function handleDeleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} photo${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    for (const id of ids) {
      await fetch(`/api/photos/${id}`, { method: "DELETE" });
    }
    setPhotos((prev) => prev.filter((p) => !ids.includes(p.id)));
    setSelected(new Set());
    setDeleting(false);
    if (session) setSession({ ...session, photoCount: session.photoCount - ids.length });
  }

  async function handleDeleteOne(id: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (session) setSession({ ...session, photoCount: session.photoCount - 1 });
  }

  // --- Set Cover ---
  async function handleSetCover(photoId: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverPhotoId: photoId }),
    });
    if (session) setSession({ ...session, coverPhotoId: photoId });
  }

  // --- Upload ---
  async function handleUpload() {
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const arr = Array.from(files);
    setUploadProgress({ done: 0, total: arr.length });
    for (let i = 0; i < arr.length; i += 3) {
      const batch = arr.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("sessionId", sessionId);
          const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("fail");
          return res.json();
        })
      );
      const ok = results.filter((r) => r.status === "fulfilled").map((r) => (r as any).value);
      setPhotos((prev) => [...prev, ...ok]);
      setUploadProgress((prev) => ({ ...prev, done: prev.done + batch.length }));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    const sess = await fetch(`/api/sessions/${sessionId}`).then((r) => r.json());
    setSession(sess);
  }

  if (loading) return <p className="text-center py-12 text-white/40">Loading...</p>;
  if (!session) return <p className="text-center py-12 text-red-400">Session not found</p>;

  const isCover = (id: string) => session.coverPhotoId === id;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors text-sm">← Back</Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">{session.title}</h1>
          <p className="text-sm text-white/40">📍 {session.location} · {photos.length} photos</p>
        </div>
        <div className="flex gap-2">
          <label className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm cursor-pointer">
            + Add Photos
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleUpload} />
          </label>
          <button
            onClick={() => setShowQR(true)}
            className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/10 transition-colors text-sm"
          >
            QR Code
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-4 bg-white/5 border border-white/10 rounded-lg p-3">
          <div className="flex justify-between text-sm text-white/60 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress.done}/{uploadProgress.total}</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-ocean-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Toolbar */}
      {photos.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={selectAll}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/50 hover:bg-white/10 transition-colors">
            {selected.size === photos.length ? "Deselect all" : `Select all (${photos.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <button onClick={handleDeleteSelected} disabled={deleting}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors">
                {deleting ? "Deleting..." : `🗑 Delete ${selected.size} selected`}
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-white/30 hover:text-white/60 transition-colors">
                Clear selection
              </button>
            </>
          )}
          <span className="text-xs text-white/20 ml-auto">
            {selected.size > 0 ? `${selected.size} selected` : `${photos.length} photos`}
          </span>
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-4xl mb-3">📷</p>
          <p className="mb-1">No photos yet</p>
          <p className="text-sm">Click "+ Add Photos" to upload</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative group cursor-pointer"
              onClick={() => toggleSelect(p.id)}
            >
              {/* Photo */}
              <div className={`aspect-[4/3] w-full rounded-lg overflow-hidden border-2 transition-all ${
                selected.has(p.id)
                  ? "border-ocean-500 ring-1 ring-ocean-500/50"
                  : isCover(p.id)
                  ? "border-yellow-500/60"
                  : "border-transparent group-hover:border-white/20"
              }`}>
                <img
                  src={`/uploads/previews/${p.thumbnailKey}`}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />
              </div>

              {/* Cover badge */}
              {isCover(p.id) && (
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded pointer-events-none">
                  COVER
                </div>
              )}

              {/* Checkbox */}
              <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border flex items-center justify-center text-xs transition-all pointer-events-none ${
                selected.has(p.id)
                  ? "bg-ocean-500 border-ocean-500 text-white"
                  : "border-white/30 bg-black/40 text-transparent group-hover:text-white/50 group-hover:border-white/50"
              }`}>
                ✓
              </div>

              {/* Action buttons — stop propagation so they don't toggle select */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {!isCover(p.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSetCover(p.id); }}
                    className="w-5 h-5 rounded bg-black/60 text-yellow-400 hover:bg-yellow-500 hover:text-black flex items-center justify-center text-[10px]"
                    title="Set as cover"
                  >
                    ★
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteOne(p.id); }}
                  className="w-5 h-5 rounded bg-black/60 text-white/60 hover:bg-red-500 hover:text-white flex items-center justify-center text-xs"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Session QR Code</h2>
            <p className="text-sm text-white/40 mb-4">Athletes can scan this to find their photos later</p>
            <div className="bg-white rounded-xl p-4 inline-block mb-4">
              <img src={`/api/sessions/${sessionId}/qr`} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-white/30 mb-4 break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/sessions/${sessionId}` : ""}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const link = `${window.location.origin}/sessions/${sessionId}`;
                  navigator.clipboard.writeText(link);
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors"
              >
                Copy Link
              </button>
              <a
                href={`/api/sessions/${sessionId}/qr`}
                download={`session-${sessionId}-qr.svg`}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm"
              >
                Download QR
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
