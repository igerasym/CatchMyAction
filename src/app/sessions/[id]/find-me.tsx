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

export default function FindMe({ photos, onMatchesFound }: Props) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [useCamera, setUseCamera] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load models on first open
  useEffect(() => {
    if (!open || modelsLoaded) return;
    async function load() {
      setStatus("Loading face detection models...");
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
        setStatus("");
      } catch {
        setError("Failed to load face detection models");
      }
    }
    load();
  }, [open, modelsLoaded]);

  // Cleanup camera on close
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      setUseCamera(true);
      // Wait for DOM to render video element, then attach stream
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

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  }

  // Get face descriptor from an image element or canvas
  async function getFaceDescriptor(input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    const detection = await faceapi
      .detectSingleFace(input)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection?.descriptor || null;
  }

  // Compare selfie against all session photos
  const findMatches = useCallback(
    async (selfieDescriptor: Float32Array) => {
      setStatus("Scanning photos...");
      const found: Match[] = [];
      const THRESHOLD = 0.55; // Lower = stricter match

      for (let i = 0; i < photos.length; i++) {
        setStatus(`Scanning photo ${i + 1} of ${photos.length}...`);

        try {
          const img = await loadImage(photos[i].previewUrl);
          const detections = await faceapi
            .detectAllFaces(img)
            .withFaceLandmarks()
            .withFaceDescriptors();

          for (const det of detections) {
            const distance = faceapi.euclideanDistance(selfieDescriptor, det.descriptor);
            if (distance < THRESHOLD) {
              found.push({
                photoId: photos[i].id,
                distance,
                confidence: Math.round((1 - distance) * 100),
              });
              break; // One match per photo is enough
            }
          }
        } catch {
          // Skip photos that fail to load
        }
      }

      return found;
    },
    [photos]
  );

  async function handleFileUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setMatches([]);

    try {
      const img = await loadImageFromFile(file);
      const descriptor = await getFaceDescriptor(img);
      if (!descriptor) {
        setError("No face detected in your photo. Try a clearer selfie.");
        setLoading(false);
        return;
      }

      const found = await findMatches(descriptor);
      setMatches(found);
      onMatchesFound(new Set(found.map((m) => m.photoId)));
      setStatus(found.length > 0 ? `Found you in ${found.length} photo${found.length > 1 ? "s" : ""}!` : "No matches found in this session.");
    } catch (err) {
      setError("Face detection failed. Try another photo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCameraCapture() {
    if (!videoRef.current) return;
    setLoading(true);
    setError("");
    setMatches([]);

    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setError("No face detected. Make sure your face is clearly visible.");
        setLoading(false);
        return;
      }

      stopCamera();
      const found = await findMatches(descriptor);
      setMatches(found);
      onMatchesFound(new Set(found.map((m) => m.photoId)));
      setStatus(found.length > 0 ? `Found you in ${found.length} photo${found.length > 1 ? "s" : ""}!` : "No matches found in this session.");
    } catch {
      setError("Face detection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    stopCamera();
    setOpen(false);
    // Keep matches highlighted in gallery after close
    setStatus("");
    setError("");
  }

  function handleSearchAgain() {
    stopCamera();
    setMatches([]);
    setConfirmedIds(new Set());
    setStatus("");
    setError("");
    onMatchesFound(new Set());
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-ocean-500 text-white rounded-lg hover:from-purple-500 hover:to-ocean-400 transition-all text-sm font-medium shadow-lg shadow-purple-500/20"
      >
        🔍 Find Me
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Find Yourself</h2>
            <p className="text-sm text-white/40 mb-4">
              Upload a selfie or use your camera — we&apos;ll find photos of you in this session.
            </p>

            {/* Consent */}
            {!consent ? (
              <div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 mb-4">
                  <p className="text-xs text-purple-300 leading-relaxed">
                    🔒 Your photo is processed entirely in your browser. It never leaves your device and is not stored anywhere.
                    Face matching uses AI to compare facial features.
                  </p>
                </div>
                <label className="flex items-start gap-2 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-white/5 text-ocean-500 focus:ring-ocean-500"
                  />
                  <span className="text-xs text-white/50">
                    I consent to biometric face matching as described in the{" "}
                    <a href="/privacy" target="_blank" className="text-ocean-400 hover:underline">Privacy Policy</a>
                  </span>
                </label>
              </div>

            ) : matches.length > 0 && !loading ? (
              /* ── RESULTS: confirm matches ── */
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">✓</div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      Found you in {matches.length} photo{matches.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-white/30">Tap to confirm — is this you?</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
                  {matches.map((m) => {
                    const photo = photos.find((p) => p.id === m.photoId);
                    if (!photo) return null;
                    const isConfirmed = confirmedIds.has(m.photoId);
                    const isRejected = !isConfirmed && confirmedIds.size > 0 && matches.some((x) => confirmedIds.has(x.photoId));
                    return (
                      <div key={m.photoId} className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${
                        isConfirmed
                          ? "border-green-500/30 bg-green-500/10"
                          : "border-white/10 bg-white/5"
                      }`}>
                        <img src={photo.thumbnailUrl} alt="" className="w-24 h-16 rounded-lg object-cover flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-white/30">{m.confidence}% match</span>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setConfirmedIds((prev) => { const n = new Set(prev); n.add(m.photoId); return n; })}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                              isConfirmed
                                ? "bg-green-500 text-white"
                                : "border border-green-500/30 text-green-400 hover:bg-green-500/10"
                            }`}
                          >
                            That&apos;s me ✓
                          </button>
                          <button
                            onClick={() => setConfirmedIds((prev) => { const n = new Set(prev); n.delete(m.photoId); return n; })}
                            className="px-2 py-1.5 rounded-lg text-xs border border-white/10 text-white/30 hover:bg-white/5 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const ids = confirmedIds.size > 0 ? confirmedIds : new Set(matches.map((m) => m.photoId));
                      onMatchesFound(ids);
                      // Save claims to backend if logged in
                      if (userId && ids.size > 0) {
                        fetch("/api/photos/claim", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ photoIds: Array.from(ids) }),
                        }).catch(() => {});
                      }
                      handleClose();
                    }}
                    className="flex-1 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm"
                  >
                    {confirmedIds.size > 0 ? `Show ${confirmedIds.size} Photo${confirmedIds.size > 1 ? "s" : ""} in Gallery` : "Show All in Gallery"}
                  </button>
                  <button
                    onClick={handleSearchAgain}
                    className="px-4 py-2.5 border border-white/10 text-white/50 rounded-lg hover:bg-white/5 transition-colors text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>

            ) : !loading && status && matches.length === 0 && !error ? (
              /* ── RESULTS: no matches ── */
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🤷</div>
                <p className="text-sm text-white/50 mb-1">No matches found</p>
                <p className="text-xs text-white/30 mb-4">Try a different photo with better lighting or a clearer face</p>
                <button
                  onClick={handleSearchAgain}
                  className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm"
                >
                  Try Another Photo
                </button>
              </div>

            ) : (
              /* ── SCANNING or INPUT ── */
              <div>
                {/* Loading / Status */}
                {loading && status && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm text-white/50 mb-2">
                      <svg className="animate-spin h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {status}
                    </div>
                    {/* Progress bar */}
                    {status.includes("of") && (
                      <div className="w-full bg-white/10 rounded-full h-1">
                        <div
                          className="bg-purple-500 h-1 rounded-full transition-all"
                          style={{
                            width: `${(() => {
                              const m = status.match(/(\d+) of (\d+)/);
                              return m ? (parseInt(m[1]) / parseInt(m[2])) * 100 : 0;
                            })()}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mb-4 bg-red-500/10 text-red-400 text-sm p-2.5 rounded-lg border border-red-500/20">
                    {error}
                    <button onClick={handleSearchAgain} className="block mt-1 text-xs text-red-400/60 hover:text-red-400 underline">
                      Try again
                    </button>
                  </div>
                )}

                {/* Camera view */}
                {useCamera && (
                  <div className="mb-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-lg bg-black"
                      style={{ minHeight: "240px" }}
                    />
                    <button
                      onClick={handleCameraCapture}
                      disabled={loading || !modelsLoaded}
                      className="w-full mt-2 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors text-sm"
                    >
                      {loading ? "Scanning..." : "📸 Capture & Search"}
                    </button>
                  </div>
                )}

                {/* Upload / Camera buttons — only when not scanning and no camera */}
                {!useCamera && !loading && !error && (
                  <div className="flex gap-2">
                    <label className="flex-1 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm text-center cursor-pointer">
                      📁 Upload Selfie
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={!modelsLoaded}
                      />
                    </label>
                    <button
                      onClick={startCamera}
                      disabled={!modelsLoaded}
                      className="flex-1 py-2.5 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors text-sm"
                    >
                      📷 Use Camera
                    </button>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleClose} className="w-full mt-4 text-xs text-white/30 hover:text-white/50 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Helper: load image from URL
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Helper: load image from File
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
