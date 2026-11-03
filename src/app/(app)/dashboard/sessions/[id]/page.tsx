"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PublishedPanel from "../../published-panel";
import { toastError } from "@/lib/toast";
import { ArrowLeft, Check, Star, X, Trash2, Camera, MapPin } from "lucide-react";
import { loginHref } from "@/lib/redirect";

interface Photo {
  id: string;
  thumbnailKey: string;
  thumbnailUrl?: string;
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
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [showQR, setShowQR] = useState(false);
  // ?published=1&notified=N — arrived straight from publishing
  const [justPublished, setJustPublished] = useState<{ notified: number } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("published") === "1") {
      setJustPublished({ notified: Number(q.get("notified")) || 0 });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push(loginHref(window.location.pathname));
  }, [status, router]);

  useEffect(() => {
    if (!sessionId) return;
    // The photos API pages at 50; sessions hold up to 200 — follow the cursor to load them all
    async function loadAllPhotos() {
      const all: any[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 10; page++) {
        const res: Response = await fetch(
          `/api/sessions/${sessionId}/photos?limit=50${cursor ? `&cursor=${cursor}` : ""}`
        );
        const data = await res.json();
        all.push(...(data.photos || []));
        cursor = data.nextCursor;
        if (!cursor) break;
      }
      return all;
    }
    Promise.all([fetch(`/api/sessions/${sessionId}`).then((r) => r.json()), loadAllPhotos()]).then(
      ([sess, all]) => {
        setSession(sess);
        setPhotos(all);
        setLoading(false);
      }
    );
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
    const deleted: string[] = [];
    let blocked = 0;
    let lastError = "";
    for (const id of ids) {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
      if (res.ok) deleted.push(id);
      else {
        blocked++;
        lastError = (await res.json().catch(() => ({}))).error || "";
      }
    }
    setPhotos((prev) => prev.filter((p) => !deleted.includes(p.id)));
    setSelected(new Set(ids.filter((id) => !deleted.includes(id))));
    setDeleting(false);
    if (session) setSession({ ...session, photoCount: session.photoCount - deleted.length });
    if (blocked > 0) {
      toastError(
        blocked === 1 && lastError
          ? lastError
          : `${blocked} photos weren't deleted — they were bought, and buyers keep access. Unpublish the session to hide them.`
      );
    }
  }

  async function handleDeleteOne(id: string) {
    if (!confirm("Delete this photo?")) return;
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastError(data.error || "Couldn't delete the photo");
      return;
    }
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
  async function uploadFiles(arr: File[]) {
    if (arr.length === 0) return;
    setUploading(true);
    setUploadErrors([]);
    setUploadProgress({ done: 0, total: arr.length });
    for (let i = 0; i < arr.length; i += 3) {
      const batch = arr.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("sessionId", sessionId);
          const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(`${file.name}: ${data.error || "Upload failed"}`);
          }
          return res.json();
        })
      );
      const ok = results.filter((r) => r.status === "fulfilled").map((r) => (r as any).value);
      const failed = results.filter((r) => r.status === "rejected");
      const newErrors = failed.map((r) => (r as PromiseRejectedResult).reason?.message || "Unknown error");
      setPhotos((prev) => [...prev, ...ok]);
      setUploadProgress((prev) => ({ ...prev, done: prev.done + ok.length }));
      if (newErrors.length) setUploadErrors((prev) => [...prev, ...newErrors]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    const sess = await fetch(`/api/sessions/${sessionId}`).then((r) => r.json());
    setSession(sess);
  }

  function handleUpload() {
    const files = fileRef.current?.files;
    if (files) uploadFiles(Array.from(files));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) uploadFiles(files);
  }

  if (loading) return (
    <div className="py-4 md:py-8" role="status" aria-label="Loading session">
      <div className="h-5 w-16 bg-char-2 animate-pulse mb-6" />
      <div className="flex justify-between mb-8">
        <div><div className="h-10 w-64 bg-char-2 animate-pulse mb-3" /><div className="h-4 w-32 bg-char-2 animate-pulse" /></div>
        <div className="flex gap-2"><div className="h-11 w-28 bg-char-2 animate-pulse" /><div className="h-11 w-20 bg-char-2 animate-pulse" /></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
        {[...Array(12)].map((_, i) => <div key={i} className="aspect-[4/3] bg-char-2 animate-pulse" />)}
      </div>
    </div>
  );
  if (!session) return <p className="py-16 text-center hud"><span className="text-rec">ERR</span> / Session not found</p>;

  const isCover = (id: string) => session.coverPhotoId === id;

  return (
    <div className="py-4 md:py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="hud inline-flex items-center gap-1.5 hover:text-bone transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to dashboard
        </Link>
      </div>

      {justPublished && (
        <PublishedPanel
          sessionId={sessionId as string}
          title={session.title}
          notified={justPublished.notified}
          onClose={() => setJustPublished(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8 pb-8 border-b border-line">
        <div>
          <p className="hud mb-4">Session / Manage photos</p>
          <h1 className="disp text-[clamp(30px,4.5vw,52px)] text-bone">{session.title}<span className="text-rec">.</span></h1>
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-dim mt-3">
            <MapPin className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-hidden="true" />
            {session.location} · {photos.length} photos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="btn-sec py-3 px-5 text-sm"
          >
            Done
          </button>
          <label className="btn-pri py-3 px-5 text-sm cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-bone">
            + Add Photos
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={handleUpload} />
          </label>
          <button
            onClick={() => setShowQR(true)}
            className="btn-sec py-3 px-5 text-sm"
          >
            QR Code
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploading && (
        <div className="mb-6 bg-char-2 border border-line p-4" role="status" aria-live="polite">
          <div className="flex justify-between hud mb-2">
            <span className="flex items-center gap-2"><span className="rec-dot blink" aria-hidden="true" /> Uploading...</span>
            <span className="text-bone">{uploadProgress.done}/{uploadProgress.total}</span>
          </div>
          <div className="w-full bg-ink h-1">
            <div className="bg-rec h-1 transition-all"
              style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Upload errors */}
      {uploadErrors.length > 0 && (
        <div className="mb-6 bg-ink border border-line border-l-2 border-l-rec p-4" role="alert">
          <p className="hud text-rec mb-2">Some photos were rejected</p>
          <ul className="text-sm text-mute space-y-1">
            {uploadErrors.map((err, i) => (
              <li key={i}>— {err}</li>
            ))}
          </ul>
          <button onClick={() => setUploadErrors([])} className="hud hover:text-bone mt-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Toolbar */}
      {photos.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={selectAll}
            className="px-3.5 py-2 text-xs font-bold border border-line text-mute hover:text-bone hover:border-bone transition-colors">
            {selected.size === photos.length ? "Deselect all" : `Select all (${photos.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <button onClick={handleDeleteSelected} disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border border-rec text-rec hover:bg-rec hover:text-rec-ink disabled:opacity-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                {deleting ? "Deleting..." : `Delete ${selected.size} selected`}
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-xs text-dim hover:text-bone underline underline-offset-4 decoration-line transition-colors">
                Clear selection
              </button>
            </>
          )}
          <span className="hud ml-auto" aria-live="polite">
            {selected.size > 0 ? `${selected.size} selected` : `${photos.length} photos`}
          </span>
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="space-y-6">
          {/* QR Code — prominent when no photos */}
          <div className="relative bg-char-2 border border-line p-8 text-center">
            <div className="brk brk-sm" aria-hidden="true" />
            <p className="hud mb-3">01 / Share</p>
            <h2 className="disp text-3xl text-bone mb-3">Share with athletes<span className="text-rec">.</span></h2>
            <p className="text-sm text-mute mb-6 max-w-md mx-auto">
              Print or show this QR code at the spot. Athletes scan it to subscribe and get notified when you upload photos.
            </p>
            <div className="bg-bone p-4 inline-block mb-4">
              <img src={`/api/sessions/${sessionId}/qr`} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="font-mono text-[11px] text-dim mb-5 break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/sessions/${sessionId}` : ""}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const link = `${window.location.origin}/sessions/${sessionId}`;
                  navigator.clipboard.writeText(link);
                }}
                className="btn-sec py-2.5 px-4 text-sm"
              >
                Copy Link
              </button>
              <a
                href={`/api/sessions/${sessionId}/qr`}
                download={`session-${sessionId}-qr.svg`}
                className="btn-pri py-2.5 px-4 text-sm"
              >
                Download QR
              </a>
            </div>
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
            role="button"
            tabIndex={0}
            aria-label="Upload photos: drag and drop or click to browse"
            className={`relative text-center py-14 border border-dashed cursor-pointer transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-bone ${
              dragging ? "border-rec bg-rec/10" : "border-line hover:border-bone"
            }`}
          >
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 border border-line bg-ink flex items-center justify-center">
                <Camera className="w-7 h-7 text-bone" strokeWidth={1.5} aria-hidden="true" />
              </div>
            </div>
            <p className="text-bone font-bold mb-1">Upload photos when ready</p>
            <p className="text-sm text-mute">Drag & drop photos here or click to browse</p>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative transition-all ${dragging ? "outline outline-1 outline-offset-4 outline-rec" : ""}`}
        >
          {dragging && (
            <div className="absolute inset-0 bg-ink/80 border border-dashed border-rec z-10 flex items-center justify-center">
              <p className="hud text-rec">Drop photos to upload</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
          {photos.map((p) => (
            <div
              key={p.id}
              className="relative group cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-bone"
              onClick={() => toggleSelect(p.id)}
              onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleSelect(p.id); } }}
              role="checkbox"
              aria-checked={selected.has(p.id)}
              aria-label={`Photo${isCover(p.id) ? " (cover)" : ""}`}
              tabIndex={0}
            >
              {/* Photo */}
              <div className={`aspect-[4/3] w-full overflow-hidden bg-char-3 transition-opacity ${
                selected.has(p.id) ? "opacity-80" : ""
              }`}>
                <img
                  src={p.thumbnailUrl || `/api/uploads/previews/${p.thumbnailKey}`}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none"
                  loading="lazy"
                />
              </div>

              {/* Frame: rec when selected, soft bone on hover */}
              <span className={`brk brk-sm ${selected.has(p.id) ? "brk-rec" : isCover(p.id) ? "" : "brk-hover"}`} aria-hidden="true" />

              {/* Cover badge */}
              {isCover(p.id) && (
                <div className="absolute bottom-1.5 left-1.5 tag-ghost pointer-events-none">
                  COVER
                </div>
              )}

              {/* Checkbox */}
              <div aria-hidden="true" className={`absolute top-1.5 left-1.5 w-5 h-5 border flex items-center justify-center transition-all pointer-events-none ${
                selected.has(p.id)
                  ? "bg-rec border-rec text-rec-ink"
                  : "border-bone/50 bg-ink/60 text-transparent group-hover:text-bone/70 group-hover:border-bone"
              }`}>
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>

              {/* Action buttons — stop propagation so they don't toggle select */}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-all">
                {!isCover(p.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSetCover(p.id); }}
                    className="w-10 h-10 md:w-7 md:h-7 bg-ink/80 text-bone hover:bg-bone hover:text-ink flex items-center justify-center"
                    title="Set as cover"
                    aria-label="Set as cover"
                  >
                    <Star className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteOne(p.id); }}
                  className="w-10 h-10 md:w-7 md:h-7 bg-ink/80 text-bone hover:bg-rec hover:text-rec-ink flex items-center justify-center"
                  title="Delete"
                  aria-label="Delete photo"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="session-qr-title" className="bg-char-2 border border-line p-7 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="hud mb-3">QR / Session</p>
            <h2 id="session-qr-title" className="disp text-2xl text-bone mb-2">Session QR code<span className="text-rec">.</span></h2>
            <p className="text-sm text-mute mb-5">Athletes can scan this to find their photos later</p>
            <div className="bg-bone p-4 inline-block mb-4">
              <img src={`/api/sessions/${sessionId}/qr`} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="font-mono text-[11px] text-dim mb-5 break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/sessions/${sessionId}` : ""}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  const link = `${window.location.origin}/sessions/${sessionId}`;
                  navigator.clipboard.writeText(link);
                }}
                className="btn-sec py-2.5 px-4 text-sm"
              >
                Copy Link
              </button>
              <a
                href={`/api/sessions/${sessionId}/qr`}
                download={`session-${sessionId}-qr.svg`}
                className="btn-pri py-2.5 px-4 text-sm"
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
