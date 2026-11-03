"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Search, Camera, Upload, Loader2, ScanFace, ArrowRight, X, Check } from "lucide-react";

interface Photo {
  id: string;
  previewUrl: string;
  thumbnailUrl: string;
}

interface Props {
  sessionId: string;
  photos: Photo[];
  onMatchFound: (photoIds: string[]) => void;
  /** Open the selfie dialog on mount (deep link from the homepage: ?findme=1) */
  autoOpen?: boolean;
}

export default function FindMe({ sessionId, photos, onMatchFound, autoOpen }: Props) {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;

  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ photoId: string; similarity: number }[] | null>(null);
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function handleOpen() {
    if (!userId) {
      // Come back to this session with the selfie dialog open after signing in
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname + "?findme=1")}`;
      return;
    }
    setOpen(true);
    setResults(null);
    setError("");
    setCameraActive(false);
  }

  function handleClose() {
    stopCamera();
    setOpen(false);
  }

  // Deep link from homepage Find Me: open once the auth state is known
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!autoOpen || autoOpened.current || status === "loading") return;
    autoOpened.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("findme");
    window.history.replaceState({}, "", url.pathname + url.search);
    if (!userId) {
      window.location.href = `/login?callbackUrl=${encodeURIComponent(url.pathname + "?findme=1")}`;
      return;
    }
    handleOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, status, userId]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      setError("Camera access denied. Try uploading a photo instead.");
    }
  }

  // Attach stream when video element mounts
  function videoRefCallback(el: HTMLVideoElement | null) {
    (videoRef as any).current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  async function captureAndSearch() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stopCamera();
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      await searchWithFile(file);
    }, "image/jpeg", 0.9);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await searchWithFile(file);
  }

  async function searchWithFile(file: File) {
    setSearching(true);
    setError("");
    setResults(null);

    try {
      const fd = new FormData();
      fd.append("selfie", file);

      const res = await fetch(`/api/sessions/${sessionId}/find-me`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      setResults(data.matches || []);

      if (data.matches?.length > 0) {
        const matchedIds = data.matches.map((m: any) => m.photoId);
        onMatchFound(matchedIds);

        // Auto-claim matched photos
        fetch("/api/photos/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: matchedIds }),
        }).catch(() => {});
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSearching(false);
    }
  }

  if (!open) {
    return (
      <button onClick={handleOpen}
        className="group relative w-full flex items-center gap-4 p-5 sm:p-6 bg-rec text-rec-ink text-left transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-bone">
        <span aria-hidden="true" className="brk brk-sm" style={{ ["--c" as any]: "#160806", inset: "-6px" }} />
        <span aria-hidden="true" className="w-14 h-14 shrink-0 grid place-items-center bg-ink text-bone">
          <ScanFace className="w-8 h-8" strokeWidth={1.6} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-mono text-[10.5px] font-bold tracking-[0.12em] uppercase">Find me · face match</span>
          <span className="block disp text-[clamp(24px,7vw,34px)] mt-1.5">Find me with a selfie</span>
          <span className="block text-[13px] mt-1.5 font-medium">Scans every photo in this session. Your selfie is not stored.</span>
        </span>
        <ArrowRight aria-hidden="true" className="w-6 h-6 shrink-0 transition-transform group-hover:translate-x-1" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-ink/90 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => !searching && handleClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="findme-title"
        className="relative bg-char-2 border border-line w-full sm:max-w-sm p-6 pb-8 sm:pb-6" onClick={(e) => e.stopPropagation()}>
        {!searching && (
          <button onClick={handleClose} aria-label="Close"
            className="absolute top-3 right-3 w-10 h-10 grid place-items-center text-mute hover:text-bone transition-colors">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        <p className="hud mb-3 flex items-center gap-2"><span className="rec-dot" aria-hidden="true" />Find me</p>
        <h2 id="findme-title" className="disp text-[30px] text-bone mb-2">Find your photos<span className="text-rec">.</span></h2>
        <p className="text-sm text-mute mb-6">Upload a selfie and we&apos;ll find the photos with your face in this session.</p>

        {error && (
          <div role="alert" className="text-sm text-bone p-3 border-l-2 border-rec bg-ink mb-4">{error}</div>
        )}

        {searching ? (
          <div className="text-center py-8" role="status" aria-live="polite">
            <Loader2 className="w-8 h-8 text-rec animate-spin mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-bone">Searching for your face…</p>
            <p className="hud mt-2">This takes a few seconds</p>
          </div>
        ) : results !== null ? (
          <div className="text-center py-2" role="status" aria-live="polite">
            {results.length > 0 ? (
              <>
                <div className="relative w-16 h-16 grid place-items-center mx-auto mb-4 bg-ink">
                  <span aria-hidden="true" className="brk brk-rec brk-sm" />
                  <Check className="w-7 h-7 text-rec" aria-hidden="true" />
                </div>
                <p className="disp text-[28px] text-bone mb-2">It&apos;s you. <span className="text-rec">×{results.length}</span></p>
                <p className="text-sm text-mute mb-6">Found {results.length} photo{results.length > 1 ? "s" : ""} — they&apos;re marked in the gallery and added to your cart.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 grid place-items-center mx-auto mb-4 bg-ink">
                  <Search className="w-7 h-7 text-dim" aria-hidden="true" />
                </div>
                <p className="disp text-[24px] text-bone mb-2">No matches found</p>
                <p className="text-sm text-mute mb-6">Try a clearer selfie with good lighting, or your face might not be visible in these photos.</p>
              </>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={() => { setResults(null); setError(""); }}
                className="btn-sec flex-1 justify-center !py-3 !text-sm">
                Try again
              </button>
              <button onClick={handleClose}
                className={`${results.length > 0 ? "btn-rec" : "btn-pri"} flex-1 justify-center !py-3 !text-sm`}>
                {results.length > 0 ? "View photos" : "Close"}
              </button>
            </div>
          </div>
        ) : cameraActive ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden bg-ink">
              <video ref={videoRefCallback} autoPlay playsInline muted
                onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play()}
                aria-label="Camera preview"
                className="w-full" style={{ transform: "scaleX(-1)" }} />
              <span aria-hidden="true" className="brk brk-rec" style={{ inset: "12px" }} />
            </div>
            <button onClick={captureAndSearch}
              className="btn-rec w-full justify-center">
              <Camera className="w-5 h-5" aria-hidden="true" /> Capture &amp; search
            </button>
            <button onClick={() => { stopCamera(); }}
              className="w-full py-3 text-sm text-mute hover:text-bone transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mobile: native front camera — primary on phones */}
            <label className="sm:hidden btn-rec w-full justify-center cursor-pointer">
              <Camera className="w-5 h-5" aria-hidden="true" /> Take a selfie
              <input type="file" accept="image/*" capture="user" className="sr-only"
                onChange={handleFile} />
            </label>

            {/* Desktop: webcam */}
            <button onClick={startCamera}
              className="hidden sm:flex btn-rec w-full justify-center">
              <Camera className="w-5 h-5" aria-hidden="true" /> Use camera
            </button>

            <label className="relative block w-full py-8 bg-ink text-center cursor-pointer group hover:bg-char-3 transition-colors">
              <span aria-hidden="true" className="brk brk-soft brk-sm" />
              <Upload className="w-6 h-6 mx-auto mb-2 text-mute group-hover:text-bone" aria-hidden="true" />
              <span className="text-sm font-semibold text-bone">Upload a selfie</span>
              <span className="block hud mt-1">JPG · PNG · WEBP</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                onChange={handleFile} />
            </label>

            <p className="text-xs text-dim text-center pt-1">
              Your selfie is sent to our server for face matching and is not stored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
