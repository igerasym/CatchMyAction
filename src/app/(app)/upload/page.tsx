"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import SpotAutocomplete from "@/app/components/spot-autocomplete";
import PasswordInput from "@/app/components/password-input";
import DateTimeInput from "@/app/components/date-time-input";
import { toastError, toastWarning } from "@/lib/toast";
import { useUploadQueue } from "@/hooks/use-upload-queue";
import { UploadStatus } from "@/app/components/upload-status";
import dynamic from "next/dynamic";
import { UploadCloud, Camera } from "lucide-react";
import { CHECKBOX, HINT, INPUT, LABEL, LINK, Notice, PageIntro } from "../ui";

const LocationPicker = dynamic(() => import("@/app/components/location-picker"), { ssr: false });

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

export default function UploadPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  // Session form state — available to everyone
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  // Catalogue spot picked from suggestions (null = free text → server geocodes / asks for a pin)
  const [spotId, setSpotId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("9.99");
  const [sportType, setSportType] = useState("surf");
  const [formError, setFormError] = useState("");

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
  const uploads = useUploadQueue(sessionId);
  const [dragging, setDragging] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
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
      body: JSON.stringify({ title, location, spotId, date, startTime, endTime, description, pricePerPhoto: Math.round(parseFloat(price) * 100), sportType }),
    });
    const data = await res.json();
    if (data.id) {
      localStorage.removeItem(DRAFT_KEY);
      if (data.needsLocation) {
        setPendingSessionId(data.id);
        setShowLocationPicker(true);
      } else {
        setSessionId(data.id);
      }
    } else {
      setFormError(data.error || "Failed to create session");
    }
  }

  // Handle "Continue" — check auth, show modal or create session
  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    saveDraft();

    if (startTime >= endTime) {
      setFormError("Start time must be before end time");
      return;
    }

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
  const uploadFiles = uploads.add;

  async function handleUploadPhotos() {
    const files = fileInputRef.current?.files;
    if (!files) return;
    uploadFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        toastWarning("Verify your email to publish sessions. Go to Settings → Profile.");
      } else {
        toastError(data.error || "Failed to publish");
      }
      return;
    }
    const data = await res.json().catch(() => ({}));
    window.location.href = `/dashboard/sessions/${sessionId}?published=1&notified=${Number(data.notified) || 0}`;
  }

  const inputClass = INPUT;

  // --- STEP 2: Upload photos ---
  if (sessionId) {
    return (
      <div className="max-w-2xl mx-auto py-4 md:py-8">
        <PageIntro kicker="02 / Upload" title="Upload photos" className="mb-10">
          Select up to 200 photos. They will be automatically watermarked.
        </PageIntro>
        <div className="space-y-5">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            role="button"
            tabIndex={0}
            aria-label="Add photos: drag and drop or click to browse"
            className={`relative border border-dashed p-10 md:p-14 text-center cursor-pointer transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-bone ${
              dragging
                ? "border-rec bg-rec/10"
                : "border-line bg-char-2 hover:border-bone"
            }`}
          >
            <div className={`brk ${dragging ? "brk-rec" : "brk-soft"}`} aria-hidden="true" />
            <UploadCloud className={`w-10 h-10 mx-auto mb-4 ${dragging ? "text-rec" : "text-bone"}`} strokeWidth={1.5} aria-hidden="true" />
            <p className="text-bone font-bold mb-1">
              {dragging ? "Drop photos here" : "Drag & drop photos here"}
            </p>
            <p className="hud">or click to browse · JPEG, PNG, WebP</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
              onChange={handleUploadPhotos} />
          </div>
          <UploadStatus
            total={uploads.total} done={uploads.done} failed={uploads.failed}
            inProgress={uploads.inProgress} retryableCount={uploads.retryableCount}
            onRetry={uploads.retryFailed} onDismiss={uploads.dismissFailed}
          />
          <div className="flex gap-3">
            {uploads.done > 0 && !uploads.inProgress && (
              <button onClick={handlePublish}
                className="btn-pri flex-1 justify-center">
                Publish Session ({uploads.done} photos)
              </button>
            )}
          </div>

          {/* Skip upload — go to manage page with QR */}
          {!uploads.inProgress && (
            <div className="pt-6 border-t border-line">
              <button
                onClick={() => window.location.href = `/dashboard/sessions/${sessionId}`}
                className="btn-sec text-sm"
              >
                {uploads.done > 0 ? "Manage Session →" : "Skip — Upload Later & Get QR Code"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STEP 1: Session form (available to everyone) ---
  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8">
      <PageIntro kicker="01 / New session" title="Create a session" className="mb-10">
        {user ? "Fill in the session details to get started." : "Fill in the details — you can sign up in the next step."}
        {" "}<a href="/guide" className={LINK}>Read the photographer guide →</a>
      </PageIntro>

      <form onSubmit={handleContinue} className="space-y-6 border-t border-line pt-8">
        <div>
          <label htmlFor="session-title" className={LABEL}>Session title</label>
          <input id="session-title" value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Morning session at Pipeline" className={inputClass} />
        </div>
        <div>
          <SpotAutocomplete value={location} onChange={setLocation} onSelectSpot={(sp) => setSpotId(sp?.id ?? null)} label="Spot" sport={sportType} />
          <p className={HINT}>Pick from suggestions or type any spot name, e.g. &ldquo;La Cicer, Las Palmas&rdquo; or &ldquo;Dreamland, Bali&rdquo;</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="session-date" className={LABEL}>Date</label>
            <DateTimeInput id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              max={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
              min={`${new Date().getFullYear() - 1}-01-01`} className={inputClass} />
          </div>
          <div>
            <label htmlFor="session-start" className={LABEL}>Start</label>
            <DateTimeInput id="session-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label htmlFor="session-end" className={LABEL}>End</label>
            <DateTimeInput id="session-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="session-sport" className={LABEL}>Sport</label>
            <select id="session-sport" value={sportType} onChange={(e) => setSportType(e.target.value)} className={inputClass}>
              <option value="surf">Surf</option>
              <option value="kite">Kite</option>
              <option value="windsurf">Windsurf</option>
              <option value="wakeboard">Wakeboard</option>
              <option value="skate">Skate</option>
              <option value="mtb">MTB</option>
              <option value="moto">Moto</option>
              <option value="ski">Ski</option>
              <option value="snowboard">Snowboard</option>
              <option value="marathon">Marathon / Running</option>
              <option value="triathlon">Triathlon</option>
              <option value="cycling">Cycling</option>
              <option value="climbing">Climbing</option>
              <option value="crossfit">CrossFit</option>
              <option value="parkour">Parkour / Freerunning</option>
              <option value="kayak">Kayak / Canoe</option>
              <option value="diving">Diving</option>
              <option value="paragliding">Paragliding</option>
              <option value="bmx">BMX</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="session-price" className={LABEL}>Price per photo ($)</label>
            <input id="session-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required
              min="0" max="999" step="0.01" className={inputClass} placeholder="0 for free"
              disabled={parseFloat(price) === 0 && price === "0"} />
          </div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1 pb-3">
            <label htmlFor="session-free" className="flex items-center gap-2 cursor-pointer">
              <input id="session-free" type="checkbox" checked={parseFloat(price) === 0}
                onChange={(e) => setPrice(e.target.checked ? "0" : "9.99")}
                className={CHECKBOX} />
              <span className="text-sm text-bone">Free session</span>
            </label>
            {parseFloat(price) === 0
              ? <span className="font-mono text-[11px] tracking-[0.06em] text-dim">Max 50 photos</span>
              : <span className="font-mono text-[11px] tracking-[0.06em] text-dim">Suggested: $5–$15</span>
            }
          </div>
        </div>
        <div>
          <label htmlFor="session-description" className={LABEL}>Description (optional)</label>
          <textarea id="session-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            placeholder="4-6ft, offshore winds..." className={inputClass} />
        </div>
        {formError && (
          <Notice>{formError}</Notice>
        )}
        <button type="submit" className="btn-pri w-full justify-center">
          {user ? "Create Session" : "Continue →"}
        </button>
      </form>

      {/* Upgrade Info (for logged-in users) */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4" onClick={() => setShowUpgrade(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="upgrade-title" className="bg-char-2 border border-line w-full max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 border border-line bg-ink flex items-center justify-center mb-5">
              <Camera className="w-7 h-7 text-bone" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <p className="hud mb-3">Account / Upgrade</p>
            <h2 id="upgrade-title" className="disp text-2xl text-bone mb-3">Photographer account required<span className="text-rec">.</span></h2>
            <p className="text-sm text-mute mb-6">
              You&apos;re registered as a regular user. To create sessions and upload photos, upgrade your account to Photographer in Settings.
            </p>
            <a
              href="/settings"
              className="btn-pri w-full justify-center text-sm"
            >
              Go to Settings
            </a>
            <button onClick={() => setShowUpgrade(false)} className="w-full mt-4 hud hover:text-bone transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && pendingSessionId && (
        <LocationPicker
          locationName={location}
          onSelect={async (lat, lng) => {
            await fetch(`/api/sessions/${pendingSessionId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ locationLat: lat, locationLng: lng }),
            });
            setShowLocationPicker(false);
            setSessionId(pendingSessionId);
            setPendingSessionId(null);
          }}
          onClose={() => {
            setShowLocationPicker(false);
            setSessionId(pendingSessionId);
            setPendingSessionId(null);
          }}
        />
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4" onClick={() => setShowAuth(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="upload-auth-title" className="relative bg-char-2 border border-line w-full max-w-sm p-7" onClick={(e) => e.stopPropagation()}>
            <div className="brk brk-sm" aria-hidden="true" />
            <p className="hud mb-3">Account / {authMode === "register" ? "Sign up" : "Sign in"}</p>
            <h2 id="upload-auth-title" className="disp text-2xl text-bone mb-2">
              {authMode === "register" ? "Create your account" : "Welcome back"}<span className="text-rec">.</span>
            </h2>
            <p className="text-sm text-mute mb-6">
              {authMode === "register"
                ? "Sign up as a photographer to save your session"
                : "Sign in to continue"}
            </p>

            {authError && (
              <Notice className="mb-4">{authError}</Notice>
            )}

            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === "register" && (
                <input value={authName} onChange={(e) => setAuthName(e.target.value)} required aria-label="Your name" autoComplete="name"
                  placeholder="Your name" className={inputClass} />
              )}
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required aria-label="Email" autoComplete="email"
                placeholder="Email" className={inputClass} />
              <PasswordInput id="upload-auth-password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required
                autoComplete={authMode === "register" ? "new-password" : "current-password"}
                placeholder="Password" minLength={6} className={`${inputClass} pr-10`} />

              {authMode === "register" && (
                <label htmlFor="upload-agree" className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input id="upload-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                    className={`mt-0.5 ${CHECKBOX}`} />
                  <span className="text-xs text-mute leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className={LINK}>Terms</a>
                    {" "}and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className={LINK}>Privacy Policy</a>
                  </span>
                </label>
              )}

              <button type="submit" disabled={authLoading || (authMode === "register" && !agreed)}
                className="btn-pri w-full justify-center text-sm disabled:opacity-40">
                {authLoading ? "..." : authMode === "register" ? "Sign up & Create Session" : "Sign in & Create Session"}
              </button>
            </form>

            <p className="text-sm text-mute mt-5 pt-4 border-t border-line">
              {authMode === "register" ? (
                <>Already have an account? <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className={LINK}>Sign in</button></>
              ) : (
                <>New here? <button onClick={() => { setAuthMode("register"); setAuthError(""); }} className={LINK}>Create account</button></>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

