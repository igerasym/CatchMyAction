"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toastSuccess, toastError, toastWarning } from "@/lib/toast";
import PasswordInput from "@/app/components/password-input";
import { Check, AlertTriangle } from "lucide-react";
import { CHECKBOX, INPUT, LABEL, LINK, Notice, PageIntro } from "../ui";

interface UserData {
  name: string; bio: string; website: string;
  instagram: string; youtube: string; tiktok: string; avatarUrl: string;
}

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [form, setForm] = useState<UserData>({
    name: "", bio: "", website: "", instagram: "", youtube: "", tiktok: "", avatarUrl: "",
  });
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/settings");
  }, [status, router]);

  // Load full profile from API
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/user?id=${user.id}`).then((r) => r.json()).then((data) => {
      setForm({
        name: data.name || "", bio: data.bio || "", website: data.website || "",
        instagram: data.instagram || "", youtube: data.youtube || "",
        tiktok: data.tiktok || "", avatarUrl: data.avatarUrl || "",
      });
      setEmail(data.email || "");
      setVerified(!!data.emailVerified);
    });
  }, [user?.id]);

  function set(key: keyof UserData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const body: Record<string, string> = { id: user.id, ...form };
    if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
    const res = await fetch("/api/user", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) setMessage({ type: "err", text: data.error });
    else { setMessage({ type: "ok", text: "Settings saved" }); setCurrentPassword(""); setNewPassword(""); window.location.reload(); }
  }

  if (status !== "authenticated") return (
    <div className="max-w-2xl mx-auto py-4 md:py-8 space-y-6" role="status" aria-label="Loading settings">
      <div className="h-12 w-56 bg-char-2 animate-pulse" />
      <div className="w-20 h-20 rounded-full bg-char-2 animate-pulse" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-char-2 animate-pulse" />)}
    </div>
  );

  const inp = INPUT;

  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8 pb-16">
      <PageIntro kicker="You / Account" title="Settings" className="mb-10" />

      {message && (
        <Notice tone={message.type === "ok" ? "ok" : "rec"} className="mb-8">{message.text}</Notice>
      )}

      {/* Avatar — outside form to prevent form submit interference */}
      <div className="mb-10 pb-8 border-b border-line">
        <AvatarUpload userId={user.id} userName={form.name} currentUrl={form.avatarUrl}
          onUploaded={async (url) => { setForm((p) => ({ ...p, avatarUrl: url })); await update(); }} />
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Profile */}
        <SectionHeader title="Profile" className="pt-6 border-t border-line" />
        <div className="space-y-5">
          <Field label="Name" htmlFor="settings-name">
            <input id="settings-name" value={form.name} onChange={set("name")} required className={inp} />
          </Field>
          <Field label="Email" htmlFor="settings-email">
            <input id="settings-email" value={email} disabled className={`${inp} cursor-not-allowed`} />
            {verified ? (
              <p className="hud mt-2 flex items-center gap-1.5 text-bone"><Check className="w-3.5 h-3.5" aria-hidden="true" /> Email verified</p>
            ) : (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <p className="hud text-rec flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Email not verified</p>
                <button type="button" onClick={async () => {
                  const res = await fetch("/api/auth/resend-verification", { method: "POST" });
                  const data = await res.json();
                  if (data.sent) toastSuccess("Verification email sent! Check your inbox.");
                  else if (data.already) { toastSuccess("Email already verified!"); setVerified(true); }
                }} className={`text-xs ${LINK}`}>
                  Resend verification
                </button>
              </div>
            )}
          </Field>
          <Field label="Bio" htmlFor="settings-bio">
            <textarea id="settings-bio" value={form.bio} onChange={set("bio")} rows={3} placeholder="Tell us about yourself..."
              className={inp} />
          </Field>
        </div>

        {/* Payouts — Photographers only */}
        {user?.role === "PHOTOGRAPHER" && (
          <div className="pt-2">
            <SectionHeader title="Payouts" className="pt-6 border-t border-line" />
            <StripeConnect />
          </div>
        )}

        {/* Social Links */}
        <SectionHeader title="Social Links" className="pt-6 border-t border-line" />
        <div className="space-y-5">
          <Field label="Website" htmlFor="settings-website">
            <input id="settings-website" value={form.website} onChange={set("website")} placeholder="https://yoursite.com" className={inp} />
          </Field>
          <Field label="Instagram" htmlFor="settings-instagram">
            <div className="flex">
              <span className="px-3.5 py-3 bg-char-3 border border-line border-r-0 text-dim text-[15px] font-mono" aria-hidden="true">@</span>
              <input id="settings-instagram" value={form.instagram} onChange={set("instagram")} placeholder="username"
                className={inp} />
            </div>
          </Field>
          <Field label="YouTube" htmlFor="settings-youtube">
            <div className="flex">
              <span className="px-3.5 py-3 bg-char-3 border border-line border-r-0 text-dim text-[15px] font-mono" aria-hidden="true">@</span>
              <input id="settings-youtube" value={form.youtube} onChange={set("youtube")} placeholder="channel"
                className={inp} />
            </div>
          </Field>
          <Field label="TikTok" htmlFor="settings-tiktok">
            <div className="flex">
              <span className="px-3.5 py-3 bg-char-3 border border-line border-r-0 text-dim text-[15px] font-mono" aria-hidden="true">@</span>
              <input id="settings-tiktok" value={form.tiktok} onChange={set("tiktok")} placeholder="username"
                className={inp} />
            </div>
          </Field>
        </div>

        {/* Password */}
        <SectionHeader title="Change Password" className="pt-6 border-t border-line" />
        <div className="space-y-5">
          <Field label="Current Password" htmlFor="settings-current-password">
            <PasswordInput id="settings-current-password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Leave blank to keep current" className={`${inp} pr-10`} />
          </Field>
          <Field label="New Password" htmlFor="settings-new-password">
            <PasswordInput id="settings-new-password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, upper + lower + number" minLength={8} className={`${inp} pr-10`} />
          </Field>
        </div>

        <button type="submit" disabled={saving} className="btn-pri w-full justify-center disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Account Type */}
      {user?.role === "USER" && (
        <UpgradeSection userId={user.id} update={update}
          onSuccess={(msg) => setMessage({ type: "ok", text: msg })}
          onError={(msg) => setMessage({ type: "err", text: msg })} />
      )}
      {user?.role === "PHOTOGRAPHER" && (
        <div className="mt-12 p-6 bg-char-2 border border-line">
          <SectionHeader title="Account Type" />
          <div className="flex flex-wrap items-center gap-3 mt-4 mb-5">
            <span className="tag-ghost border border-line">PHOTOGRAPHER</span>
            <span className="text-sm text-mute">You can create sessions and upload photos</span>
          </div>
          <DowngradeSection userId={user.id} update={update}
            onSuccess={(msg) => setMessage({ type: "ok", text: msg })}
            onError={(msg) => setMessage({ type: "err", text: msg })} />
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-12 pt-8 border-t border-line">
        <SectionHeader title="Danger Zone" className="!text-rec" />
        <p className="text-sm text-mute mt-3 mb-4">Permanently delete your account and all data. This cannot be undone.</p>
        <button
          onClick={async () => {
            const pw = prompt("Enter your password to confirm account deletion:");
            if (!pw) return;
            if (!confirm("Are you sure? This will permanently delete your account, all sessions, photos, and purchases.")) return;
            const res = await fetch("/api/user/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password: pw }),
            });
            const data = await res.json();
            if (data.deleted) {
              toastSuccess("Account deleted.");
              await signOut({ callbackUrl: "/" }); // clear the session cookie — it outlived the account before
            } else {
              toastError(data.error || "Failed to delete account");
            }
          }}
          className="px-4 py-2.5 text-sm font-bold border border-rec text-rec hover:bg-rec hover:text-rec-ink transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ title, className = "" }: { title: string; className?: string }) {
  return <h2 className={`hud text-bone ${className}`}>{title}</h2>;
}

function StripeConnect() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stripe/connect").then((r) => r.json()).then(setStatus).finally(() => setLoading(false));
  }, []);

  async function handleConnect() {
    setConnecting(true);
    setError("");
    const res = await fetch("/api/stripe/connect", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else {
      setError(data.error || "Failed to connect");
      setConnecting(false);
    }
  }

  if (loading) return <p className="hud mt-3" role="status">Loading payout status...</p>;

  if (status?.connected && status?.chargesEnabled) {
    return (
      <div className="mt-4 p-4 bg-char-2 border border-line border-l-2 border-l-bone">
        <div className="flex items-center gap-2 mb-1">
          <Check className="w-4 h-4 text-bone" aria-hidden="true" />
          <p className="text-sm text-bone font-bold">Stripe Connected</p>
        </div>
        <p className="text-sm text-mute">Payouts are enabled. You receive 82% of each sale automatically.</p>
      </div>
    );
  }

  if (status?.connected && !status?.chargesEnabled) {
    return (
      <div className="mt-4 p-4 bg-char-2 border border-line border-l-2 border-l-rec">
        <p className="text-sm text-bone font-bold mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rec" aria-hidden="true" /> Setup incomplete</p>
        <p className="text-sm text-mute mb-4">Stripe needs more information to enable payouts.</p>
        <button type="button" onClick={handleConnect} disabled={connecting}
          className="btn-rec py-2.5 px-4 text-sm disabled:opacity-50">
          {connecting ? "Redirecting..." : "Complete Setup"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-5 bg-char-2 border border-line">
      <p className="text-bone font-bold mb-2">Get paid for your photos</p>
      <p className="text-sm text-mute mb-3">Connect your Stripe account to receive payouts when your photos sell.</p>
      <ul className="text-sm text-mute mb-5 space-y-1.5">
        <li><span className="text-rec font-mono mr-2" aria-hidden="true">›</span>You keep 82% of each sale</li>
        <li><span className="text-rec font-mono mr-2" aria-hidden="true">›</span>Automatic payouts to your bank account</li>
        <li><span className="text-rec font-mono mr-2" aria-hidden="true">›</span>Stripe handles all payment processing securely</li>
        <li><span className="text-rec font-mono mr-2" aria-hidden="true">›</span>Takes about 2 minutes to set up</li>
      </ul>
      {error && (
        <Notice className="mb-4">{error}</Notice>
      )}
      <button type="button" onClick={handleConnect} disabled={connecting}
        className="btn-pri text-sm disabled:opacity-50">
        {connecting ? "Redirecting to Stripe..." : "Connect Stripe Account"}
      </button>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function UpgradeSection({ userId, update, onSuccess, onError }: {
  userId: string; update: () => Promise<any>;
  onSuccess: (msg: string) => void; onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) { onError("Please agree to the terms"); return; }
    setLoading(true);
    const res = await fetch("/api/user", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: "PHOTOGRAPHER", currentPassword: password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) onError(data.error);
    else { onSuccess("Upgraded to Photographer!"); await update(); window.location.reload(); }
  }
  return (
    <section className="mt-12 p-6 bg-char-2 border border-line">
      <SectionHeader title="Become a Photographer" />
      <p className="text-sm text-mute mt-4 mb-5">Upgrade to create sessions, upload photos, and start selling.</p>
      <form onSubmit={handle} className="space-y-3">
        <label htmlFor="upgrade-password" className={LABEL}>Confirm your password</label>
        <PasswordInput id="upgrade-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required
          placeholder="Confirm your password"
          className={`${INPUT} pr-10`} />
        <label htmlFor="upgrade-agree" className="flex items-start gap-2.5 cursor-pointer">
          <input id="upgrade-agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className={`mt-0.5 ${CHECKBOX}`} />
          <span className="text-xs text-mute leading-relaxed">I own the rights to photos I will upload and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className={LINK}>Terms</a></span>
        </label>
        <button type="submit" disabled={loading || !agreed}
          className="btn-pri text-sm disabled:opacity-40">
          {loading ? "Upgrading..." : "Upgrade to Photographer"}
        </button>
      </form>
    </section>
  );
}

function DowngradeSection({ userId, update, onSuccess, onError }: {
  userId: string; update: () => Promise<any>;
  onSuccess: (msg: string) => void; onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/user", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, role: "USER", currentPassword: password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) onError(data.error);
    else { onSuccess("Switched to regular user."); setOpen(false); await update(); window.location.reload(); }
  }
  if (!open) return (
    <button onClick={() => setOpen(true)} className={`text-sm ${LINK}`}>
      Switch to regular user account →
    </button>
  );
  return (
    <form onSubmit={handle} className="mt-4 p-4 bg-ink border border-line space-y-3">
      <p className="text-sm text-mute">Your sessions remain but you won&apos;t be able to upload new ones.</p>
      <PasswordInput id="downgrade-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Confirm password"
        className={`${INPUT} pr-10`} />
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="px-4 py-2.5 text-sm font-bold border border-rec text-rec hover:bg-rec hover:text-rec-ink disabled:opacity-50 transition-colors">
          {loading ? "..." : "Downgrade"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2.5 text-sm text-mute hover:text-bone">Cancel</button>
      </div>
    </form>
  );
}

function AvatarUpload({ userId, userName, currentUrl, onUploaded }: {
  userId: string; userName: string; currentUrl: string; onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl);

  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    // Resize client-side to avoid body size limits (cover fit to 512x512)
    const resized = await new Promise<Blob>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;
        // Cover fit: scale to fill, crop center
        const scale = Math.max(512 / img.width, 512 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (512 - w) / 2, (512 - h) / 2, w, h);
        canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85);
      };
      img.src = URL.createObjectURL(file);
    });

    const fd = new FormData();
    fd.append("file", new File([resized], "avatar.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.avatarUrl) {
      onUploaded(data.avatarUrl);
    }
  }

  async function handleRemove() {
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, avatarUrl: "" }),
    });
    setPreview("");
    onUploaded("");
  }

  return (
    <div className="flex items-center gap-5">
      <div className="w-20 h-20 rounded-full bg-char-3 flex items-center justify-center overflow-hidden border border-line flex-shrink-0">
        {preview ? (
          <img src={preview} alt="Your avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="disp text-bone text-2xl" aria-hidden="true">{userName?.charAt(0)?.toUpperCase() || "?"}</span>
        )}
      </div>
      <div>
        <p className="hud mb-3">Avatar</p>
        <div className="flex gap-2">
        <label className="btn-sec py-2 px-3.5 text-xs cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-bone">
          {uploading ? "Uploading..." : "Change Photo"}
          <input type="file" accept="image/*" onChange={handleFile} className="sr-only" disabled={uploading} />
        </label>
        {preview && (
          <button type="button" onClick={handleRemove}
            className="px-3.5 py-2 border border-line text-xs font-bold text-mute hover:text-rec hover:border-rec transition-colors">
            Remove
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
