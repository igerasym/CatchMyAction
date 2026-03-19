"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import SpotAutocomplete from "@/app/components/spot-autocomplete";

const DRAFT_KEY = "catchmyaction_session_draft";

interface Draft {
  title: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
}

interface UploadState {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  // Session form state — available to everyone
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("9.99");

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
  async function createSession(photographerId: string) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, location, date, startTime, endTime, description, photographerId, pricePerPhoto: Math.round(parseFloat(price) * 100) }),
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
      await createSession(user.id);
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
    // Wait for session to update, then create session
    // Small delay for NextAuth to propagate
    setTimeout(async () => {
      const sess = await fetch("/api/auth/session").then((r) => r.json());
      if (sess?.user) {
        await createSession((sess.user as any).id);
      }
    }, 500);
  }

  // Upload photos
  async function handleUploadPhotos() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0 || !sessionId) return;
    const arr = Array.from(files);
    setUploadState({ total: arr.length, completed: 0, failed: 0, inProgress: true });
    for (let i = 0; i < arr.length; i += 3) {
      const batch = arr.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("sessionId", sessionId);
          const res = await fetch("/api/photos/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("fail");
        })
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.filter((r) => r.status === "rejected").length;
      setUploadState((p) => ({ ...p, completed: p.completed + ok, failed: p.failed + fail }));
    }
    setUploadState((p) => ({ ...p, inProgress: false }));
  }

  async function handlePublish() {
    if (!sessionId) return;
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
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
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="w-full text-white/60" />
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
            <button onClick={handleUploadPhotos} disabled={uploadState.inProgress}
              className="flex-1 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors">
              {uploadState.inProgress ? "Uploading..." : "Upload Photos"}
            </button>
            {uploadState.completed > 0 && !uploadState.inProgress && (
              <button onClick={handlePublish}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors">
                Publish Session
              </button>
            )}
          </div>
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
      </p>

      <form onSubmit={handleContinue} className="space-y-4">
        <div>
          <label className="block text-xs text-white/40 mb-1">Session Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Morning session at Pipeline" className={inputClass} />
        </div>
        <SpotAutocomplete value={location} onChange={setLocation} label="Location" />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Price per Photo ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required
              min="0.50" max="999" step="0.01" className={inputClass} />
          </div>
          <div className="flex items-end pb-0.5">
            <p className="text-xs text-white/20">Suggested: $5–$15 for action sports</p>
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

      {/* Upgrade Modal (for logged-in users) */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Become a Photographer</h2>
            <p className="text-sm text-white/40 mb-5">
              Upgrade your account to create sessions and upload photos.
            </p>
            <UpgradeInline
              userId={user?.id}
              onSuccess={async () => {
                setShowUpgrade(false);
                // Refresh session and create
                await fetch("/api/auth/session");
                window.location.reload();
              }}
              onError={(msg) => setAuthError(msg)}
            />
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
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required
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

function UpgradeInline({ userId, onSuccess, onError }: {
  userId: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [upgradeAgreed, setUpgradeAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!upgradeAgreed) { onError("Please agree to the terms"); return; }
    setLoading(true);
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: "PHOTOGRAPHER", currentPassword: password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) onError(data.error);
    else onSuccess();
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
        placeholder="Confirm your password"
        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent placeholder-white/25" />
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={upgradeAgreed} onChange={(e) => setUpgradeAgreed(e.target.checked)}
          className="mt-0.5 rounded border-white/20 bg-white/5 text-ocean-500 focus:ring-ocean-500" />
        <span className="text-[11px] text-white/40 leading-relaxed">
          I own the rights to photos I will upload and agree to the{" "}
          <a href="/terms" target="_blank" className="text-ocean-400 hover:underline">Terms</a>
        </span>
      </label>
      <button type="submit" disabled={loading || !upgradeAgreed}
        className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors text-sm">
        {loading ? "Upgrading..." : "Upgrade & Continue"}
      </button>
    </form>
  );
}
