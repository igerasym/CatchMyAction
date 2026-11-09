"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PasswordInput from "@/app/components/password-input";
import Link from "next/link";
import { Check, Circle, Mail } from "lucide-react";
import { AuthShell, CHECKBOX, INPUT, LABEL, LINK, Notice } from "../ui";
import { safeCallbackUrl } from "@/lib/redirect";
import { useRedirectIfSignedIn } from "@/hooks/use-redirect-if-signed-in";
import { passwordChecks, roleFromQuery, ROLE_OPTIONS, type Role } from "./roles";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [role, setRole] = useState<Role>("USER");
  const [password, setPassword] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/");
  // Set once the form is submitted: signing in right after sign-up must not trigger the "already signed in" redirect
  const [submitted, setSubmitted] = useState(false);
  useRedirectIfSignedIn(callbackUrl, role === "PHOTOGRAPHER", !submitted);

  // /register?role=photographer (homepage CTA) · ?callbackUrl=/sessions/x (came from a buy / find-me gate)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setRole(roleFromQuery(q.get("role")));
    setCallbackUrl(safeCallbackUrl(q.get("callbackUrl")));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) { setError("You must agree to the Terms and Privacy Policy"); return; }
    setError("");
    setLoading(true);
    setSubmitted(true);
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
      setSubmitted(false);
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
        <fieldset>
          <legend className={LABEL}>How will you use CatchMyAction?</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((o) => {
              const selected = role === o.value;
              return (
                <label
                  key={o.value}
                  htmlFor={`role-${o.value}`}
                  className={`relative flex flex-col cursor-pointer border p-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-bone ${
                    selected ? "border-rec bg-ink" : "border-line bg-ink/40 hover:border-bone"
                  }`}
                >
                  <input
                    type="radio"
                    id={`role-${o.value}`}
                    name="role"
                    value={o.value}
                    checked={selected}
                    onChange={() => setRole(o.value)}
                    className="sr-only"
                  />
                  {selected && <span className="brk brk-sm brk-rec" aria-hidden="true" />}
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center mb-3 ${selected ? "border-rec" : "border-line"}`}
                    aria-hidden="true"
                  >
                    {selected && <span className="w-2 h-2 rounded-full bg-rec" />}
                  </span>
                  <span className="font-bold text-bone leading-snug">{o.title}</span>
                  <span className={`hud mt-1.5 ${selected ? "text-rec" : ""}`}>{o.who}</span>
                  <span className="text-sm text-mute mt-1.5 leading-snug">{o.body}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
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
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} />
          <div id="password-hint" className="mt-3">
            <p className="text-sm text-mute mb-2">Your password needs:</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {passwordChecks(password).map((c) => (
                <li key={c.label} className={`flex items-center gap-2 ${c.ok ? "text-bone" : "text-mute"}`}>
                  {c.ok
                    ? <Check className="w-3.5 h-3.5 text-rec flex-shrink-0" aria-hidden="true" />
                    : <Circle className="w-3.5 h-3.5 text-dim flex-shrink-0" aria-hidden="true" />}
                  <span>{c.label}<span className="sr-only">{c.ok ? " (done)" : ""}</span></span>
                </li>
              ))}
            </ul>
          </div>
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
