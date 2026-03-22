"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import * as faceapi from "face-api.js";

interface Photo {
  id: string;
  previewUrl: string;
  thumbnailUrl: string;
}

interface Match {
  photoId: string;
  distance: number;
  confidence: number;
}

interface Props {
  photos: Photo[];
  onMatchesFound: (matchedIds: Set<string>) => void;
}

type Step = "idle" | "consent" | "input" | "scanning" | "results" | "no-results";

export default function FindMe({ photos, onMatchesFound }: Props) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [useCamera, setUseCamera] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load models when modal opens
  useEffect(() => {
    if (!open || modelsLoaded) return;
    (async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model load error:", err);
        setError("Failed to load AI models. Please refresh.");
      }
    })();
  }, [open, modelsLoaded]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      setUseCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setError("Camera access denied");
    }
  }

  async function getFaceDescriptor(input: HTMLImageElement | HTMLVideoElement) {
    const detection = await faceapi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection?.descriptor || null;
  }

  const scanPhotos = useCallback(async (selfieDescriptor: Float32Array) => {
    setStep("scanning");
    setScanProgress({ current: 0, total: photos.length });
    const found: Match[] = [];
    const THRESHOLD = 0.55;

    for (let i = 0; i < photos.length; i++) {
      setScanProgress({ current: i + 1, total: photos.length });
      try {
        const img = await loadImage(photos[i].previewUrl);
        const detections = await faceapi
          .detectAllFaces(img)
          .withFaceLandmarks()
          .withFaceDescriptors();

        for (const det of detections) {
          const distance = faceapi.euclideanDistance(selfieDescriptor, det.descriptor);
          if (distance < THRESHOLD) {
            found.push({ photoId: photos[i].id, distance, confidence: Math.round((1 - distance) * 100) });
            break;
          }
        }
      } catch { /* skip */ }
    }

    setMatches(found);
    if (found.length > 0) {
      const ids = new Set(found.map((m) => m.photoId));
      onMatchesFound(ids);
      // Save claims
      if (userId) {
        fetch("/api/photos/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoIds: Array.from(ids) }),
        }).catch(() => {});
      }
      setStep("results");
    } else {
      setStep("no-results");
    }
  }, [photos, onMatchesFound, userId]);

  async function handleFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError("");
    try {
      const img = await loadImageFromFile(file);
      const descriptor = await getFaceDescriptor(img);
      if (!descriptor) { setError("No face detected. Try a clearer photo."); return; }
      await scanPhotos(descriptor);
    } catch (err) {
      console.error("Find Me error:", err);
      setError("Detection failed. Try another photo.");
    }
  }

  async function handleCapture() {
    if (!videoRef.current) return;
    setError("");
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      stopCamera();
      if (!descriptor) { setError("No face detected. Try again."); return; }
      await scanPhotos(descriptor);
    } catch (err) {
      console.error("Capture error:", err);
      setError("Detection failed. Try again.");
    }
  }

  function handleOpen() {
    setOpen(true);
    setStep("consent");
    setMatches([]);
    setError("");
  }

  function handleClose() {
    stopCamera();
    setOpen(false);
    setStep("idle");
    // Clear matches if user didn't view results
    if (step !== "results") {
      onMatchesFound(new Set());
    }
  }

  function handleRetry() {
    setMatches([]);
    setError("");
    setStep("input");
    onMatchesFound(new Set());
    if (fileRef.current) fileRef.current.value = "";
  }

  const progress = scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0;

  return (
    <>
      <button onClick={handleOpen}
        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-ocean-500 text-white rounded-lg hover:from-purple-500 hover:to-ocean-400 transition-all text-sm font-medium shadow-lg shadow-purple-500/20">
        🔍 Find Me
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-lg font-bold text-white">Find Yourself</h2>
              <p className="text-sm text-white/40 mt-0.5">
                {step === "consent" && "We'll scan session photos to find you"}
                {step === "input" && "Upload a selfie or use your camera"}
                {step === "scanning" && `Scanning ${scanProgress.current} of ${scanProgress.total} photos...`}
                {step === "results" && `Found you in ${matches.length} photo${matches.length > 1 ? "s" : ""}`}
                {step === "no-results" && "No matches found in this session"}
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              {error && (
                <div className="mb-4 bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20">{error}</div>
              )}

              {/* STEP: Consent */}
              {step === "consent" && (
                <div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-4">
                    <div className="flex gap-3">
                      <span className="text-2xl">🔒</span>
                      <div>
                        <p className="text-sm text-purple-200 font-medium mb-1">100% Private</p>
                        <p className="text-xs text-purple-300/70 leading-relaxed">
                          Your selfie is processed in your browser only. It never leaves your device and is never stored.
                        </p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setStep("input")}
                    className="w-full py-3 bg-ocean-500 text-white rounded-xl hover:bg-ocean-400 transition-colors font-medium">
                    I Understand — Let's Go
                  </button>
                </div>
              )}

              {/* STEP: Input */}
              {step === "input" && !useCamera && (
                <div className="space-y-3">
                  <label className="block w-full py-10 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-ocean-500/50 hover:bg-ocean-500/5 transition-all">
                    <span className="text-3xl block mb-2">📸</span>
                    <span className="text-sm text-white/50">Upload a selfie</span>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      onChange={handleFile} disabled={!modelsLoaded} />
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/20">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  {/* Mobile: native camera */}
                  <label className="sm:hidden block w-full py-3 border border-white/10 text-white/60 rounded-xl hover:bg-white/5 transition-colors text-center cursor-pointer">
                    📷 Take a Selfie
                    <input type="file" accept="image/*" capture="user" className="hidden"
                      onChange={handleFile} disabled={!modelsLoaded} />
                  </label>
                  {/* Desktop: webcam */}
                  <button onClick={startCamera} disabled={!modelsLoaded}
                    className="hidden sm:block w-full py-3 border border-white/10 text-white/60 rounded-xl hover:bg-white/5 disabled:opacity-30 transition-colors">
                    📷 Use Camera
                  </button>
                  {!modelsLoaded && (
                    <p className="text-xs text-white/20 text-center">Loading AI models...</p>
                  )}
                </div>
              )}

              {/* STEP: Camera */}
              {step === "input" && useCamera && (
                <div>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full rounded-xl bg-black mb-3" style={{ minHeight: "240px" }} />
                  <button onClick={handleCapture}
                    className="w-full py-3 bg-ocean-500 text-white rounded-xl hover:bg-ocean-400 transition-colors font-medium">
                    📸 Capture & Search
                  </button>
                </div>
              )}

              {/* STEP: Scanning */}
              {step === "scanning" && (
                <div className="py-8 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                      <circle cx="40" cy="40" r="36" fill="none" stroke="url(#gradient)" strokeWidth="4"
                        strokeDasharray={`${progress * 2.26} 226`} strokeLinecap="round" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <p className="text-sm text-white/40">Analyzing faces...</p>
                </div>
              )}

              {/* STEP: Results */}
              {step === "results" && (
                <div>
                  <div className="flex items-center gap-3 mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-lg">✓</div>
                    <div>
                      <p className="text-sm font-medium text-white">Found you in {matches.length} photo{matches.length > 1 ? "s" : ""}</p>
                      <p className="text-xs text-white/30">Photos are highlighted in the gallery</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mb-4">
                    {matches.slice(0, 8).map((m) => {
                      const photo = photos.find((p) => p.id === m.photoId);
                      return photo ? (
                        <div key={m.photoId} className="relative aspect-square rounded-lg overflow-hidden ring-2 ring-purple-500/60">
                          <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-purple-500/90 text-white px-1 rounded">
                            {m.confidence}%
                          </span>
                        </div>
                      ) : null;
                    })}
                    {matches.length > 8 && (
                      <div className="aspect-square rounded-lg bg-white/5 flex items-center justify-center text-xs text-white/30">
                        +{matches.length - 8}
                      </div>
                    )}
                  </div>
                  <button onClick={handleClose}
                    className="w-full py-3 bg-ocean-500 text-white rounded-xl hover:bg-ocean-400 transition-colors font-medium">
                    View in Gallery
                  </button>
                  <button onClick={() => { onMatchesFound(new Set()); handleClose(); }}
                    className="w-full mt-2 text-xs text-white/20 hover:text-white/40 transition-colors py-1">
                    Dismiss
                  </button>
                </div>
              )}

              {/* STEP: No results */}
              {step === "no-results" && (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🤷</div>
                  <p className="text-sm text-white/40 mb-1">Couldn't find you in this session</p>
                  <p className="text-xs text-white/20 mb-4">Try a different photo with better lighting</p>
                  <button onClick={handleRetry}
                    className="w-full py-3 bg-ocean-500 text-white rounded-xl hover:bg-ocean-400 transition-colors font-medium">
                    Try Another Photo
                  </button>
                </div>
              )}
            </div>

            {/* Footer — hide on results (View in Gallery is the action) */}
            {step !== "scanning" && step !== "results" && (
              <div className="px-6 pb-4">
                <button onClick={handleClose} className="w-full text-xs text-white/20 hover:text-white/40 transition-colors py-2">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
