"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Search, Camera, Upload, Loader2 } from "lucide-react";

interface Photo {
  id: string;
  previewUrl: string;
  thumbnailUrl: string;
}

interface Props {
  sessionId: string;
  photos: Photo[];
  onMatchFound: (photoIds: string[]) => void;
}

export default function FindMe({ sessionId, photos, onMatchFound }: Props) {
  const { data: session } = useSession();
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
      window.location.href = "/login";
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
        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-ocean-500 text-white rounded-lg hover:from-purple-500 hover:to-ocean-400 transition-all text-sm font-medium shadow-lg shadow-purple-500/20">
        <Search className="w-4 h-4 inline mr-1" /> Find Me
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => !searching && handleClose()}>
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">Find Your Photos</h2>
        <p className="text-sm text-white/40 mb-5">Upload a selfie and we'll find photos with your face in this session.</p>

        {error && (
          <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20 mb-4">{error}</div>
        )}

        {searching ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-ocean-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/50">Searching for your face...</p>
            <p className="text-xs text-white/25 mt-1">This takes a few seconds</p>
          </div>
        ) : results !== null ? (
          <div className="text-center py-4">
            {results.length > 0 ? (
              <>
                <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-400 text-2xl">✓</span>
                </div>
                <p className="text-lg font-semibold text-white mb-1">Found {results.length} photo{results.length > 1 ? "s" : ""}!</p>
                <p className="text-sm text-white/40 mb-4">Your photos are highlighted in the gallery below.</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-white/30" />
                </div>
                <p className="text-lg font-semibold text-white mb-1">No matches found</p>
                <p className="text-sm text-white/40 mb-4">Try a clearer selfie with good lighting, or your face might not be visible in these photos.</p>
              </>
            )}
            <div className="flex gap-2 justify-center">
              <button onClick={() => { setResults(null); setError(""); }}
                className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors text-sm">
                Try Again
              </button>
              <button onClick={handleClose}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm">
                {results.length > 0 ? "View Photos" : "Close"}
              </button>
            </div>
          </div>
        ) : cameraActive ? (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden bg-black">
              <video ref={videoRefCallback} autoPlay playsInline muted
                onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play()}
                className="w-full rounded-xl" style={{ transform: "scaleX(-1)" }} />
            </div>
            <button onClick={captureAndSearch}
              className="w-full py-3 bg-ocean-500 text-white rounded-xl hover:bg-ocean-400 transition-colors font-medium">
              <Camera className="w-4 h-4 inline mr-1" /> Capture & Search
            </button>
            <button onClick={() => { stopCamera(); }}
              className="w-full py-2 text-xs text-white/30 hover:text-white/50 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block w-full py-10 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-ocean-500/50 hover:bg-ocean-500/5 transition-all">
              <Upload className="w-7 h-7 mx-auto mb-2 text-white/40" />
              <span className="text-sm text-white/50">Upload a selfie</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={handleFile} />
            </label>

            {/* Mobile: native camera */}
            <label className="sm:hidden block w-full py-3 border border-white/10 text-white/60 rounded-xl hover:bg-white/5 transition-colors text-center cursor-pointer">
              <Camera className="w-4 h-4 inline mr-1" /> Take a Selfie
              <input type="file" accept="image/*" capture="user" className="hidden"
                onChange={handleFile} />
            </label>

            {/* Desktop: webcam */}
            <button onClick={startCamera}
              className="hidden sm:block w-full py-3 border border-white/10 text-white/60 rounded-xl hover:bg-white/5 transition-colors">
              <Camera className="w-4 h-4 inline mr-1" /> Use Camera
            </button>

            <p className="text-[11px] text-white/20 text-center">
              Your selfie is sent to our server for face matching and is not stored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
