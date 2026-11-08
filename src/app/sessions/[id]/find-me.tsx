"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Search, Camera, Upload, Loader2, ScanFace, ArrowRight, X, Check } from "lucide-react";
import { browserSessionStorage, savePendingMatches } from "@/lib/find-me-pending";

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
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ photoId: string; similarity: number }[] | null>(null);
  // Matches the user ticked as "this is me" (strong matches pre-ticked, borderline ones not)
  const [picked, setPicked] = useState<Set<string>>(new Set());
  // Explicit biometric consent at the moment of use; remembered for this tab only
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    try { setConsent(sessionStorage.getItem("cma-face-consent") === "1"); } catch {}
  }, []);
  function toggleConsent(v: boolean) {
    setConsent(v);
    try { v ? sessionStorage.setItem("cma-face-consent", "1") : sessionStorage.removeItem("cma-face-consent"); } catch {}
  }
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // No sign-in needed to search: login is asked only at buy/download time
  function handleOpen() {
    setOpen(true);
    setResults(null);
    setError("");
    setCameraActive(false);
  }

  function handleClose() {
    stopCamera();
    setOpen(false);
  }

  // Deep link from homepage Find Me (?findme=1): open the dialog once, signed in or not
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!autoOpen || autoOpened.current) return;
    autoOpened.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("findme");
    window.history.replaceState({}, "", url.pathname + url.search);
    handleOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

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
    e.target.value = ""; // allow picking the same file again after "Try again"
    if (!file) return;
    await searchWithFile(file);
  }

  /** Phone selfies are often 5–12 MB; shrink to ≤1600px JPEG (plenty for face matching, under the 5 MB API limit). */
  async function prepareSelfie(file: File): Promise<File> {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      if (scale === 1 && file.size < 4 * 1024 * 1024 && file.type === "image/jpeg") return file;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.88));
      return blob ? new File([blob], "selfie.jpg", { type: "image/jpeg" }) : file;
    } catch {
      return file; // HEIC etc. that the browser can't decode — let the server try
    }
  }

  async function searchWithFile(file: File) {
    setSearching(true);
    setError("");
    setResults(null);

    try {
      const fd = new FormData();
      fd.append("selfie", await prepareSelfie(file));
      fd.append("consent", consent ? "1" : "0");

      const res = await fetch(`/api/sessions/${sessionId}/find-me`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      const matches: { photoId: string; similarity: number }[] = data.matches || [];
      setResults(matches);
      // Nothing is tagged or claimed until the user confirms which matches are really them
      setPicked(new Set(matches.filter((m) => m.similarity >= 90).map((m) => m.photoId)));
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function confirmMatches() {
    const ids = Array.from(picked);
    if (ids.length > 0) {
      onMatchFound(ids);
      if (userId) {
        fetch("/api/photos/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: ids }),
        }).catch(() => {});
      } else {
        // Not signed in: keep the picks in this tab; they're claimed after login (see photo-grid)
        savePendingMatches(browserSessionStorage(), sessionId, ids);
      }
    }
    handleClose();
  }

  const thumbOf = (id: string) => photos.find((p) => p.id === id)?.thumbnailUrl;

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
              <div className="text-left">
                <p className="disp text-[26px] text-bone mb-1">
                  Is this you? <span className="text-rec">×{results.length}</span>
                </p>
                <p className="text-sm text-mute mb-4">
                  Tick the photos you&apos;re in. Only those get marked as yours.
                  {!userId && " You can sign in later, when you buy or download."}
                </p>
                <ul className="grid grid-cols-3 gap-2 max-h-[46vh] overflow-y-auto mb-5" aria-label="Possible matches">
                  {results.map((m, i) => {
                    const on = picked.has(m.photoId);
                    const src = thumbOf(m.photoId);
                    return (
                      <li key={m.photoId}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          aria-label={`Match ${i + 1}, ${Math.round(m.similarity)}% similar — ${on ? "marked as me" : "not me"}`}
                          onClick={() =>
                            setPicked((prev) => {
                              const n = new Set(prev);
                              n.has(m.photoId) ? n.delete(m.photoId) : n.add(m.photoId);
                              return n;
                            })
                          }
                          className={`relative block w-full aspect-[4/5] bg-ink overflow-hidden ${on ? "" : "opacity-60"}`}
                        >
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="absolute inset-0 grid place-items-center hud">Photo</span>
                          )}
                          {on && <span aria-hidden="true" className="brk brk-rec brk-sm" />}
                          <span className={`absolute bottom-1 left-1 ${on ? "tag-rec" : "tag-ghost"}`}>
                            {Math.round(m.similarity)}%
                          </span>
                          {on && (
                            <span aria-hidden="true" className="absolute top-1 right-1 w-5 h-5 grid place-items-center bg-rec text-rec-ink">
                              <Check className="w-3.5 h-3.5" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex gap-2">
                  <button onClick={() => { setResults(null); setError(""); }} className="btn-sec flex-1 justify-center !py-3 !text-sm">
                    Try again
                  </button>
                  <button onClick={confirmMatches} className="btn-rec flex-1 justify-center !py-3 !text-sm">
                    {picked.size > 0 ? `That's me · ${picked.size}` : "None of these"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 grid place-items-center mx-auto mb-4 bg-ink">
                  <Search className="w-7 h-7 text-dim" aria-hidden="true" />
                </div>
                <p className="disp text-[24px] text-bone mb-2">No matches found</p>
                <p className="text-sm text-mute mb-6">Try a clearer selfie with good lighting, or your face might not be visible in these photos.</p>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => { setResults(null); setError(""); }} className="btn-sec flex-1 justify-center !py-3 !text-sm">
                    Try again
                  </button>
                  <button onClick={handleClose} className="btn-pri flex-1 justify-center !py-3 !text-sm">
                    Browse all photos
                  </button>
                </div>
              </>
            )}
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
            <label className="flex items-start gap-3 p-3 bg-ink cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => toggleConsent(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#ff4433] shrink-0"
              />
              <span className="text-[13px] leading-snug text-mute">
                I agree that my selfie is compared with the faces in this session&apos;s photos. It&apos;s used only
                for this search and not stored.{" "}
                <a href="/privacy" target="_blank" className="text-bone underline underline-offset-2">Privacy &amp; face data</a>
              </span>
            </label>
            <fieldset disabled={!consent} className={`space-y-3 ${consent ? "" : "opacity-40 pointer-events-none"}`}>
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

            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
}
