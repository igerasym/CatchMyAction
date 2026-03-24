"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import SpotAutocomplete from "@/app/components/spot-autocomplete";
import PasswordInput from "@/app/components/password-input";
import DateTimeInput from "@/app/components/date-time-input";

const DRAFT_KEY = "catchmyaction_session_draft";

interface Draft {
  title: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  price?: string;
}

interface UploadState {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

export default function UploadPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  // Session form state — available to everyone
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("9.99");
  const [sportType, setSportType] = useState("surf");

  // Auth modal
  const [showAuth, setShowAuth] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // Upload state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    total: 0, completed: 0, failed: 0, inProgress: false,
  });
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d: Draft = JSON.parse(saved);
        setTitle(d.title || "");
        setLocation(d.location || "");
        setDate(d.date || "");
        setStartTime(d.startTime || "");
        setEndTime(d.endTime || "");
        setDescription(d.description || "");
        if (d.price) setPrice(d.price);
      }
    } catch {}
  }, []);

  // Save draft to localStorage
  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, location, date, startTime, endTime, description, price }));
  }

  // Create session on backend
  async function createSession() {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, location, date, startTime, endTime, description, pricePerPhoto: Math.round(parseFloat(price) * 100), sportType }),
    });
    const data = await res.json();
    if (data.id) {
      localStorage.removeItem(DRAFT_KEY);
      setSessionId(data.id);
    } else {
      alert(data.error || "Failed to create session");
    }
  }

  // Handle "Continue" — check auth, show modal or create session
  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    saveDraft();

    if (user && user.role === "PHOTOGRAPHER") {
      await createSession();
    } else if (user && user.role === "USER") {
      // Show upgrade prompt inline
      setShowUpgrade(true);
    } else {
      // Not logged in — show auth modal
      setShowAuth(true);
    }
  }

  // Handle auth (login or register) then create session
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (authMode === "register") {
      if (!agreed) { setAuthError("You must agree to Terms and Privacy Policy"); setAuthLoading(false); return; }
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword, role: "PHOTOGRAPHER" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAuthError(data.error || "Registration failed");
        setAuthLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", { email: authEmail, password: authPassword, redirect: false });
    setAuthLoading(false);

    if (result?.error) {
      setAuthError("Invalid credentials");
      return;
    }

    setShowAuth(false);
    // Wait for session to update, then check role
    setTimeout(async () => {
      const sess = await fetch("/api/auth/session").then((r) => r.json());
      if (sess?.user) {
        if ((sess.user as any).role === "PHOTOGRAPHER") {
          await createSession();
        } else {
          // Existing surfer — show upgrade modal
          setShowUpgrade(true);
        }
      }
    }, 500);
  }

  // Upload photos
  async function uploadFiles(files: File[]) {
    if (files.length === 0 || !sessionId) return;
    setUploadState({ total: files.length, completed: 0, failed: 0, inProgress: true });
    setUploadErrors([]);
    for (let i = 0; i < files.length; i += 3) {
      const batch = files.slice(i, i + 3);
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
        })
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected");
      const newErrors = failed.map((r) => (r as PromiseRejectedResult).reason?.message || "Unknown error");
      setUploadState((p) => ({ ...p, completed: p.completed + ok, failed: p.failed + failed.length }));
      if (newErrors.length) setUploadErrors((prev) => [...prev, ...newErrors]);
    }
    setUploadState((p) => ({ ...p, inProgress: false }));
  }

  async function handleUploadPhotos() {
    const files = fileInputRef.current?.files;
    if (!files) return;
    await uploadFiles(Array.from(files));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) uploadFiles(files);
  }

  async function handlePublish() {
    if (!sessionId) return;
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      if (data.needsVerification) {
        alert("Verify your email to publish sessions.\nGo to Settings → Profile to resend verification.");
      } else {
        alert(data.error || "Failed to publish");
      }
      return;
    }
    window.location.href = `/sessions/${sessionId}`;
  }

  const inputClass = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent placeholder-white/25";

  // --- STEP 2: Upload photos ---
  if (sessionId) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Upload Photos</h1>
        <p className="text-white/40 mb-6 text-sm">Select up to 200 photos. They will be automatically watermarked.</p>
        <div className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging
                ? "border-ocean-500 bg-ocean-500/10"
                : "border-white/10 hover:border-ocean-500/50 hover:bg-ocean-500/5"
            }`}
          >
            <svg className="w-10 h-10 mx-auto mb-3 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-white/50 mb-1">
              {dragging ? "Drop photos here" : "Drag & drop photos here"}
            </p>
            <p className="text-xs text-white/25">or click to browse · JPEG, PNG, WebP</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={handleUploadPhotos} />
          </div>
          {uploadState.total > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex justify-between text-sm text-white/60 mb-1">
                <span>{uploadState.completed} / {uploadState.total} uploaded</span>
                {uploadState.failed > 0 && <span className="text-red-400">{uploadState.failed} failed</span>}
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-ocean-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(uploadState.completed / uploadState.total) * 100}%` }} />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            {uploadState.completed > 0 && !uploadState.inProgress && (
              <button onClick={handlePublish}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors">
                Publish Session
              </button>
            )}
          </div>

          {uploadErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs font-medium text-red-400 mb-1">Some photos were rejected:</p>
              <ul className="text-xs text-red-400/80 space-y-0.5">
                {uploadErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skip upload — go to manage page with QR */}
          {!uploadState.inProgress && (
            <div className="text-center pt-4 border-t border-white/5">
              <button
                onClick={() => window.location.href = `/dashboard/sessions/${sessionId}`}
                className="px-5 py-2.5 border border-white/10 text-white/60 rounded-lg hover:bg-white/10 transition-colors text-sm"
              >
                {uploadState.completed > 0 ? "Manage Session →" : "Skip — Upload Later & Get QR Code"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STEP 1: Session form (available to everyone) ---
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Create a Session</h1>
      <p className="text-white/40 mb-6 text-sm">
        {user ? "Fill in the session details to get started." : "Fill in the details — you can sign up in the next step."}
        {" "}<a href="/guide" className="text-ocean-400 hover:underline">Read the photographer guide →</a>
      </p>

      <form onSubmit={handleContinue} className="space-y-4">
        <div>
          <label className="block text-xs text-white/40 mb-1">Session Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Morning session at Pipeline" className={inputClass} />
        </div>
        <SpotAutocomplete value={location} onChange={setLocation} label="Location" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Date</label>
            <DateTimeInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              max={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
              min={`${new Date().getFullYear() - 1}-01-01`} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Start</label>
            <DateTimeInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">End</label>
            <DateTimeInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Sport</label>
            <select value={sportType} onChange={(e) => setSportType(e.target.value)} className={inputClass}>
              <option value="surf">🏄 Surf</option>
              <option value="kite">🪁 Kite</option>
              <option value="windsurf">🏄‍♂️ Windsurf</option>
              <option value="wakeboard">🏄‍♂️ Wakeboard</option>
              <option value="skate">🛹 Skate</option>
              <option value="mtb">🚵 MTB</option>
              <option value="moto">🏍️ Moto</option>
              <option value="ski">⛷️ Ski</option>
              <option value="snowboard">🏂 Snowboard</option>
              <option value="marathon">🏃 Marathon / Running</option>
              <option value="triathlon">🏊 Triathlon</option>
              <option value="cycling">🚴 Cycling</option>
              <option value="climbing">🧗 Climbing</option>
              <option value="crossfit">🏋️ CrossFit</option>
              <option value="parkour">🤸 Parkour / Freerunning</option>
              <option value="kayak">🛶 Kayak / Canoe</option>
              <option value="diving">🤿 Diving</option>
              <option value="paragliding">🪂 Paragliding</option>
              <option value="bmx">🚲 BMX</option>
              <option value="other">📸 Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Price per Photo ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required
              min="0" max="999" step="0.01" className={inputClass} placeholder="0 for free" />
          </div>
          <div className="flex items-end pb-0.5">
            <p className="text-xs text-white/20">{parseFloat(price) === 0 ? "Free session — max 50 photos" : "Suggested: $5–$15"}</p>
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Description (optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="4-6ft, offshore winds..." className={inputClass} />
        </div>
        <button type="submit"
          className="w-full py-3 bg-ocean-500 text-white font-medium rounded-lg hover:bg-ocean-400 transition-colors">
          {user ? "Create Session" : "Continue →"}
        </button>
      </form>

      {/* Upgrade Info (for logged-in users) */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-2xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-ocean-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="6" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6V5a1 1 0 011-1h6a1 1 0 011 1v1" /></svg>
              </div>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Photographer Account Required</h2>
            <p className="text-sm text-white/40 mb-5">
              You&apos;re registered as a regular user. To create sessions and upload photos, upgrade your account to Photographer in Settings.
            </p>
            <a
              href="/settings"
              className="block w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm"
            >
              Go to Settings
            </a>
            <button onClick={() => setShowUpgrade(false)} className="w-full mt-3 text-xs text-white/30 hover:text-white/50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowAuth(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">
              {authMode === "register" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-white/40 mb-5">
              {authMode === "register"
                ? "Sign up as a photographer to save your session"
                : "Sign in to continue"}
            </p>

            {authError && (
              <div className="bg-red-500/10 text-red-400 text-sm p-2.5 rounded-lg mb-4 border border-red-500/20">{authError}</div>
            )}

            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === "register" && (
                <input value={authName} onChange={(e) => setAuthName(e.target.value)} required
                  placeholder="Your name" className={inputClass} />
              )}
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required
                placeholder="Email" className={inputClass} />
              <PasswordInput value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required
                placeholder="Password" minLength={6} className={inputClass} />

              {authMode === "register" && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-white/5 text-ocean-500 focus:ring-ocean-500" />
                  <span className="text-[11px] text-white/40 leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" className="text-ocean-400 hover:underline">Terms</a>
                    {" "}and{" "}
                    <a href="/privacy" target="_blank" className="text-ocean-400 hover:underline">Privacy Policy</a>
                  </span>
                </label>
              )}

              <button type="submit" disabled={authLoading || (authMode === "register" && !agreed)}
                className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
                {authLoading ? "..." : authMode === "register" ? "Sign up & Create Session" : "Sign in & Create Session"}
              </button>
            </form>

            <p className="text-center text-xs text-white/30 mt-4">
              {authMode === "register" ? (
                <>Already have an account? <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className="text-ocean-400 hover:underline">Sign in</button></>
              ) : (
                <>New here? <button onClick={() => { setAuthMode("register"); setAuthError(""); }} className="text-ocean-400 hover:underline">Create account</button></>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

