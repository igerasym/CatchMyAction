"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, Check, Loader2, ScanFace, Search, Upload, X } from "lucide-react";
import { browserSessionStorage, savePendingMatches } from "@/lib/find-me-pending";
import { prepareSelfie } from "@/lib/selfie";
import { STRONG_MATCH, type GlobalMatchSession } from "@/lib/global-find-me";

const CONSENT_KEY = "cma-face-consent";

/**
 * "Find my photos": one selfie, searched across every published session. Renders the trigger button and, once opened,
 * the whole flow in a dialog (consent -> selfie -> matches grouped by session). Picking a session saves the ticked
 * photos the same way the per-session search does, then opens that session with them highlighted.
 */
export default function FindPhotosButton({ className = "btn-pri", label = "Find my photos" }: { className?: string; label?: string }) {
  const { data: auth } = useSession();
  const userId = (auth?.user as { id?: string } | undefined)?.id;

  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<GlobalMatchSession[] | null>(null);
  const [searched, setSearched] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [consent, setConsent] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try { setConsent(sessionStorage.getItem(CONSENT_KEY) === "1"); } catch {}
  }, []);

  function toggleConsent(v: boolean) {
    setConsent(v);
    try { v ? sessionStorage.setItem(CONSENT_KEY, "1") : sessionStorage.removeItem(CONSENT_KEY); } catch {}
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  function close() {
    stopCamera();
    setOpen(false);
  }

  function reset() {
    setGroups(null);
    setError("");
  }

  // Esc closes (not while searching); the dialog takes focus when it opens
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !searching) close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searching]);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraActive(true);
    } catch {
      setError("Camera access denied. Try uploading a photo instead.");
    }
  }

  function attachVideo(el: HTMLVideoElement | null) {
    videoRef.current = el;
    if (el && streamRef.current) el.srcObject = streamRef.current;
  }

  function captureAndSearch() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stopCamera();
    canvas.toBlob((blob) => { if (blob) void search(new File([blob], "selfie.jpg", { type: "image/jpeg" })); }, "image/jpeg", 0.9);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again after "Try again"
    if (file) void search(file);
  }

  async function search(file: File) {
    setSearching(true);
    setError("");
    setGroups(null);
    try {
      const fd = new FormData();
      fd.append("selfie", await prepareSelfie(file));
      fd.append("consent", consent ? "1" : "0");
      const res = await fetch("/api/find-me", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }
      const found: GlobalMatchSession[] = data.sessions || [];
      setGroups(found);
      setSearched(data.searched ?? 0);
      // Strong matches start ticked; nothing is tagged or claimed until the person opens a session
      setPicked(new Set(found.flatMap((g) => g.matches.filter((m) => m.similarity >= STRONG_MATCH).map((m) => m.photoId))));
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function openSession(g: GlobalMatchSession) {
    const ids = g.matches.map((m) => m.photoId).filter((id) => picked.has(id));
    if (ids.length > 0) {
      if (userId) {
        fetch("/api/photos/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: ids }),
        }).catch(() => {});
      } else {
        // Not signed in: the ticks wait in this tab and are claimed after login (same as the per-session search)
        savePendingMatches(browserSessionStorage(), g.id, ids);
      }
    }
    window.location.assign(`/sessions/${g.id}`);
  }

  const total = groups?.reduce((n, g) => n + g.matches.length, 0) ?? 0;

  return (
    <>
      <button type="button" className={className} onClick={() => { reset(); setOpen(true); }}>
        <ScanFace className="w-5 h-5" aria-hidden="true" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 bg-ink/90 z-[60] flex items-end sm:items-center justify-center sm:p-4" onClick={() => !searching && close()}>
          <div role="dialog" aria-modal="true" aria-labelledby="gfm-title"
            className="relative bg-char-2 border border-line w-full sm:max-w-lg max-h-[92vh] overflow-y-auto p-6 pb-8 sm:pb-6 text-left"
            onClick={(e) => e.stopPropagation()}>
            {!searching && (
              <button ref={closeRef} onClick={close} aria-label="Close"
                className="absolute top-3 right-3 w-10 h-10 grid place-items-center text-mute hover:text-bone transition-colors">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <p className="hud mb-3 flex items-center gap-2"><span className="rec-dot" aria-hidden="true" />Find me</p>
            <h2 id="gfm-title" className="disp text-[30px] text-bone mb-2">Find your photos<span className="text-rec">.</span></h2>
            <p className="text-sm text-mute mb-6">One selfie. We check every published session for the frames you&apos;re in.</p>

            {error && <div role="alert" className="text-sm text-bone p-3 border-l-2 border-rec bg-ink mb-4">{error}</div>}

            {searching ? (
              <div className="text-center py-8" role="status" aria-live="polite">
                <Loader2 className="w-8 h-8 text-rec animate-spin mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-bone">Looking through all sessions…</p>
                <p className="hud mt-2">This can take up to 20 seconds</p>
              </div>
            ) : groups !== null ? (
              groups.length > 0 ? (
                <div role="status" aria-live="polite">
                  <p className="disp text-[26px] text-bone mb-1">Is this you? <span className="text-rec">×{total}</span></p>
                  <p className="text-sm text-mute mb-5">
                    Tick the photos you&apos;re in, then open the session. Only ticked photos are marked as yours.
                    {!userId && " You can sign in later, when you buy or download."}
                  </p>
                  <div className="space-y-6 mb-5">
                    {groups.map((g) => (
                      <section key={g.id} aria-label={g.title}>
                        <div className="flex items-baseline justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-bone truncate">{g.title}</h3>
                            <p className="font-mono text-[11px] tracking-[0.06em] text-dim truncate">
                              {g.location} · {new Date(g.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <button type="button" onClick={() => openSession(g)} className="btn-sec !py-2 !px-3 !text-xs shrink-0">
                            Open session
                          </button>
                        </div>
                        <ul className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-label={`Possible matches in ${g.title}`}>
                          {g.matches.map((m, i) => {
                            const on = picked.has(m.photoId);
                            return (
                              <li key={m.photoId}>
                                <button type="button" role="checkbox" aria-checked={on}
                                  aria-label={`${g.title}, match ${i + 1}, ${Math.round(m.similarity)}% similar, ${on ? "marked as me" : "not me"}`}
                                  onClick={() => setPicked((prev) => { const n = new Set(prev); n.has(m.photoId) ? n.delete(m.photoId) : n.add(m.photoId); return n; })}
                                  className={`relative block w-full aspect-[4/5] bg-ink overflow-hidden ${on ? "" : "opacity-60"}`}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                  {on && <span aria-hidden="true" className="brk brk-rec brk-sm" />}
                                  <span className={`absolute bottom-1 left-1 ${on ? "tag-rec" : "tag-ghost"}`}>{Math.round(m.similarity)}%</span>
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
                      </section>
                    ))}
                  </div>
                  <button onClick={reset} className="btn-sec w-full justify-center !py-3 !text-sm">Try another selfie</button>
                </div>
              ) : (
                <div className="text-center py-2" role="status" aria-live="polite">
                  <div className="w-16 h-16 grid place-items-center mx-auto mb-4 bg-ink">
                    <Search className="w-7 h-7 text-dim" aria-hidden="true" />
                  </div>
                  <p className="disp text-[24px] text-bone mb-2">No matches yet</p>
                  <p className="text-sm text-mute mb-6">
                    We looked through {searched} session{searched === 1 ? "" : "s"}. Try a clearer selfie in good light, or check back
                    after the next session is published.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={reset} className="btn-sec flex-1 justify-center !py-3 !text-sm">Try again</button>
                    <a href="/sessions" className="btn-pri flex-1 justify-center !py-3 !text-sm">Browse sessions</a>
                  </div>
                </div>
              )
            ) : cameraActive ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden bg-ink">
                  <video ref={attachVideo} autoPlay playsInline muted
                    onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play()}
                    aria-label="Camera preview" className="w-full" style={{ transform: "scaleX(-1)" }} />
                  <span aria-hidden="true" className="brk brk-rec" style={{ inset: "12px" }} />
                </div>
                <button onClick={captureAndSearch} className="btn-rec w-full justify-center">
                  <Camera className="w-5 h-5" aria-hidden="true" /> Capture &amp; search
                </button>
                <button onClick={stopCamera} className="w-full py-3 text-sm text-mute hover:text-bone transition-colors">Cancel</button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 bg-ink cursor-pointer">
                  <input type="checkbox" checked={consent} onChange={(e) => toggleConsent(e.target.checked)}
                    className="mt-0.5 w-5 h-5 accent-[#ff4433] shrink-0" />
                  <span className="text-[13px] leading-snug text-mute">
                    I agree that my selfie is compared with the faces in published photos. It&apos;s used only for this search and not stored.{" "}
                    <a href="/privacy" target="_blank" className="text-bone underline underline-offset-2">Privacy &amp; face data</a>
                  </span>
                </label>
                <fieldset disabled={!consent} className={`space-y-3 ${consent ? "" : "opacity-40 pointer-events-none"}`}>
                  <label className="sm:hidden btn-rec w-full justify-center cursor-pointer">
                    <Camera className="w-5 h-5" aria-hidden="true" /> Take a selfie
                    <input type="file" accept="image/*" capture="user" className="sr-only" onChange={onFile} />
                  </label>
                  <button type="button" onClick={startCamera} className="hidden sm:flex btn-rec w-full justify-center">
                    <Camera className="w-5 h-5" aria-hidden="true" /> Use camera
                  </button>
                  <label className="relative block w-full py-8 bg-ink text-center cursor-pointer group hover:bg-char-3 transition-colors">
                    <span aria-hidden="true" className="brk brk-soft brk-sm" />
                    <Upload className="w-6 h-6 mx-auto mb-2 text-mute group-hover:text-bone" aria-hidden="true" />
                    <span className="text-sm font-semibold text-bone">Upload a selfie</span>
                    <span className="block hud mt-1">JPG · PNG · WEBP</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
                  </label>
                </fieldset>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
