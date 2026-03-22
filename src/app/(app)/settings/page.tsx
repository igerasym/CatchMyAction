"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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
    else { setMessage({ type: "ok", text: "Settings saved" }); setCurrentPassword(""); setNewPassword(""); await update(); window.location.reload(); }
  }

  if (status !== "authenticated") return <p className="text-center py-12 text-white/40">Loading...</p>;

  const inp = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent placeholder-white/20";

  return (
    <div className="max-w-lg mx-auto mt-8 pb-16">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {message && (
        <div className={`p-3 rounded-lg mb-6 text-sm border ${
          message.type === "ok" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
        }`}>{message.text}</div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Avatar — top */}
        <div className="flex justify-center">
          <AvatarUpload userId={user.id} userName={form.name} currentUrl={form.avatarUrl}
            onUploaded={async (url) => { setForm((p) => ({ ...p, avatarUrl: url })); await update(); }} />
        </div>

        {/* Profile */}
        <SectionHeader title="Profile" />
        <div className="space-y-3">
          <Field label="Name">
            <input value={form.name} onChange={set("name")} required className={inp} />
          </Field>
          <Field label="Email">
            <input value={email} disabled className={`${inp} opacity-50 cursor-not-allowed`} />
            {verified ? (
              <p className="text-[11px] text-green-400 mt-1">✓ Email verified</p>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-yellow-400">⚠ Email not verified</p>
                <button type="button" onClick={async () => {
                  const res = await fetch("/api/auth/resend-verification", { method: "POST" });
                  const data = await res.json();
                  if (data.sent) alert("Verification email sent! Check your inbox.");
                  else if (data.already) { alert("Email already verified!"); setVerified(true); }
                }} className="text-[11px] text-ocean-400 hover:underline">
                  Resend verification
                </button>
              </div>
            )}
          </Field>
          <Field label="Bio">
            <textarea value={form.bio} onChange={set("bio")} rows={3} placeholder="Tell us about yourself..."
              className={inp} />
          </Field>
        </div>

        {/* Social Links */}
        <SectionHeader title="Social Links" />
        <div className="space-y-3">
          <Field label="Website">
            <input value={form.website} onChange={set("website")} placeholder="https://yoursite.com" className={inp} />
          </Field>
          <Field label="Instagram">
            <div className="flex">
              <span className="px-3 py-2.5 bg-white/[0.03] border border-white/10 border-r-0 rounded-l-lg text-white/30 text-sm">@</span>
              <input value={form.instagram} onChange={set("instagram")} placeholder="username"
                className={`${inp} rounded-l-none`} />
            </div>
          </Field>
          <Field label="YouTube">
            <div className="flex">
              <span className="px-3 py-2.5 bg-white/[0.03] border border-white/10 border-r-0 rounded-l-lg text-white/30 text-sm">@</span>
              <input value={form.youtube} onChange={set("youtube")} placeholder="channel"
                className={`${inp} rounded-l-none`} />
            </div>
          </Field>
          <Field label="TikTok">
            <div className="flex">
              <span className="px-3 py-2.5 bg-white/[0.03] border border-white/10 border-r-0 rounded-l-lg text-white/30 text-sm">@</span>
              <input value={form.tiktok} onChange={set("tiktok")} placeholder="username"
                className={`${inp} rounded-l-none`} />
            </div>
          </Field>
        </div>

        {/* Password */}
        <SectionHeader title="Change Password" />
        <div className="space-y-3">
          <Field label="Current Password">
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Leave blank to keep current" className={inp} />
          </Field>
          <Field label="New Password">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 chars, upper + lower + number" minLength={8} className={inp} />
          </Field>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Stripe (placeholder) */}
      {user?.role === "PHOTOGRAPHER" && (
        <>
          <SectionHeader title="Payouts" className="mt-10" />
          <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
            <p className="text-sm text-white/40 mb-3">
              Connect your Stripe account to receive payouts when your photos are purchased.
            </p>
            <button disabled
              className="px-5 py-2 bg-[#635bff]/20 text-[#635bff] border border-[#635bff]/30 rounded-lg text-sm opacity-60 cursor-not-allowed">
              Connect Stripe (Coming Soon)
            </button>
          </div>
        </>
      )}

      {/* Account Type */}
      {user?.role === "USER" && (
        <UpgradeSection userId={user.id} update={update}
          onSuccess={(msg) => setMessage({ type: "ok", text: msg })}
          onError={(msg) => setMessage({ type: "err", text: msg })} />
      )}
      {user?.role === "PHOTOGRAPHER" && (
        <div className="mt-10 p-5 rounded-xl bg-white/[0.03] border border-white/10">
          <SectionHeader title="Account Type" />
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm bg-ocean-500/20 text-ocean-400 px-2 py-0.5 rounded">Photographer</span>
            <span className="text-sm text-white/30">You can create sessions and upload photos</span>
          </div>
          <DowngradeSection userId={user.id} update={update}
            onSuccess={(msg) => setMessage({ type: "ok", text: msg })}
            onError={(msg) => setMessage({ type: "err", text: msg })} />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, className = "" }: { title: string; className?: string }) {
  return <h2 className={`text-sm font-medium text-white/60 uppercase tracking-wider ${className}`}>{title}</h2>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-white/40 mb-1">{label}</label>
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
    <section className="mt-10 p-5 rounded-xl bg-white/[0.03] border border-white/10">
      <SectionHeader title="Become a Photographer" />
      <p className="text-sm text-white/40 mb-4">Upgrade to create sessions, upload photos, and start selling.</p>
      <form onSubmit={handle} className="space-y-3">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          placeholder="Confirm your password"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-white/20 bg-white/5 text-ocean-500 focus:ring-ocean-500" />
          <span className="text-[11px] text-white/40">I own the rights to photos I will upload and agree to the <a href="/terms" target="_blank" className="text-ocean-400 hover:underline">Terms</a></span>
        </label>
        <button type="submit" disabled={loading || !agreed}
          className="px-5 py-2 bg-ocean-500/20 text-ocean-400 border border-ocean-500/30 rounded-lg hover:bg-ocean-500/30 disabled:opacity-40 transition-colors text-sm">
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
    <button onClick={() => setOpen(true)} className="text-xs text-white/30 hover:text-white/50 transition-colors">
      Switch to regular user account →
    </button>
  );
  return (
    <form onSubmit={handle} className="mt-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-3">
      <p className="text-xs text-white/40">Your sessions remain but you won't be able to upload new ones.</p>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Confirm password"
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
      <div className="flex gap-2">
        <button type="submit" disabled={loading}
          className="px-4 py-1.5 text-xs border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors">
          {loading ? "..." : "Downgrade"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-1.5 text-xs text-white/30 hover:text-white/50">Cancel</button>
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
    const fd = new FormData();
    fd.append("file", file);
    fd.append("userId", userId);
    const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.avatarUrl) {
      // Cache-bust: append timestamp so browser loads new image
      onUploaded(data.avatarUrl + "?t=" + Date.now());
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
    <div className="flex flex-col items-center gap-3">
      <div className="w-20 h-20 rounded-full bg-ocean-500/20 flex items-center justify-center overflow-hidden border-2 border-white/10 flex-shrink-0">
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-ocean-400 text-2xl font-bold">{userName?.charAt(0)?.toUpperCase() || "?"}</span>
        )}
      </div>
      <div className="flex gap-2">
        <label className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 hover:bg-white/10 cursor-pointer transition-colors">
          {uploading ? "Uploading..." : "Change Photo"}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" disabled={uploading} />
        </label>
        {preview && (
          <button type="button" onClick={handleRemove}
            className="px-3 py-1.5 border border-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
