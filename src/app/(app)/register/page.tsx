"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PasswordInput from "@/app/components/password-input";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell, CHECKBOX, HINT, INPUT, LABEL, LINK, Notice } from "../ui";
import { safeCallbackUrl } from "@/lib/redirect";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [role, setRole] = useState("USER");
  const [callbackUrl, setCallbackUrl] = useState("/");

  // /register?role=photographer (homepage CTA) · ?callbackUrl=/sessions/x (came from a buy / find-me gate)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("role") === "photographer") setRole("PHOTOGRAPHER");
    setCallbackUrl(safeCallbackUrl(q.get("callbackUrl")));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) { setError("You must agree to the Terms and Privacy Policy"); return; }
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      role: form.get("role"),
    };
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Registration failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email: data.email, password: data.password, redirect: false });
    // Signed in; show the "verify your email" step (needed before buying) with a way back to where they were
    setLoading(false);
    setSuccess(true);
  }

  const inputClass = INPUT;

  return (
    <AuthShell kicker="01 / Account" title="Create account">
      {success ? (
        <div className="py-4">
          <Mail className="w-8 h-8 text-rec mb-5" aria-hidden="true" />
          <h2 className="text-lg font-bold text-bone mb-2">Check your email</h2>
          <p className="text-sm text-mute mb-6">
            You&apos;re signed in. We sent a verification link to your email — confirm it before buying photos.
          </p>
          <a href={callbackUrl} className="btn-pri">
            {callbackUrl === "/" ? "Continue" : "Back to where you were"}
          </a>
        </div>
      ) : (
        <>
      {error && <Notice className="mb-5">{error}</Notice>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className={LABEL}>Name</label>
          <input id="name" name="name" required autoComplete="name" className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={LABEL}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={LABEL}>Password</label>
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" className={`${inputClass} pr-10`} />
          <p id="password-hint" className={HINT}>Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
        </div>
        <div>
          <label htmlFor="role" className={LABEL}>I am a...</label>
          <select id="role" name="role" className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="USER">Athlete (browse & buy photos)</option>
            <option value="PHOTOGRAPHER">Photographer (upload & sell)</option>
          </select>
        </div>
        <label htmlFor="agree" className="flex items-start gap-3 cursor-pointer">
          <input id="agree" type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className={`mt-0.5 ${CHECKBOX}`} />
          <span className="text-xs text-mute leading-relaxed">
            I agree to the{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className={LINK}>Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className={LINK}>Privacy Policy</a>,
            including the use of facial recognition technology for photo matching.
          </span>
        </label>
        <button type="submit" disabled={loading || !agreed} className="btn-pri w-full justify-center disabled:opacity-40">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="text-sm text-mute mt-6 pt-5 border-t border-line">
        Already have an account?{" "}
        <Link href="/login" className={LINK}>Sign in</Link>
      </p>
        </>
      )}
    </AuthShell>
  );
}
