"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import PasswordInput from "@/app/components/password-input";
import Link from "next/link";
import { AuthShell, INPUT, LABEL, LINK, Notice } from "../ui";
import { safeCallbackUrl } from "@/lib/redirect";
import GoogleButton from "@/app/components/google-button";
import { useRedirectIfSignedIn } from "@/hooks/use-redirect-if-signed-in";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const verified = searchParams.get("verified");
  const tokenError = searchParams.get("error");
  useRedirectIfSignedIn(callbackUrl);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
    } else {
      // replace: keep /login out of history so Back doesn't return to it
      window.location.replace(callbackUrl);
    }
  }

  return (
    <AuthShell kicker="01 / Account" title="Sign in">
      {verified && <Notice tone="ok" className="mb-5">Email verified. You can now sign in.</Notice>}
      {tokenError === "invalid-token" && <Notice className="mb-5">Invalid or expired verification link.</Notice>}
      {tokenError === "GoogleUnverified" && <Notice className="mb-5">Google says this email isn&apos;t verified, so we can&apos;t sign you in with it. Verify it in your Google account or use email and password.</Notice>}
      {tokenError === "GoogleNoEmail" && <Notice className="mb-5">Google didn&apos;t share an email address, so we can&apos;t sign you in with it.</Notice>}
      {tokenError && !["invalid-token", "GoogleUnverified", "GoogleNoEmail", "CredentialsSignin"].includes(tokenError) && (
        <Notice className="mb-5">Sign-in didn&apos;t complete. Try again, or use email and password.</Notice>
      )}
      {error && <Notice className="mb-5">{error}</Notice>}
      <GoogleButton callbackUrl={callbackUrl} divider>
        <p className="font-mono text-[11px] tracking-[0.04em] text-dim mt-3 leading-relaxed">
          New here? Continuing creates your account and means you accept the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className={LINK}>Terms</a> and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={LINK}>Privacy Policy</a>, including facial recognition for photo matching.
        </p>
      </GoogleButton>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className={LABEL}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={INPUT} />
        </div>
        <div>
          <label htmlFor="password" className={LABEL}>Password</label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" className={`${INPUT} pr-10`} />
        </div>
        <button type="submit" disabled={loading} className="btn-pri w-full justify-center disabled:opacity-50">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <div className="flex flex-wrap gap-3 justify-between text-sm text-mute mt-6 pt-5 border-t border-line">
        <Link href="/forgot-password" className={LINK}>Forgot password?</Link>
        <span>
          Don&apos;t have an account?{" "}
          <Link href={callbackUrl === "/" ? "/register" : `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className={LINK}>Sign up</Link>
        </span>
      </div>
    </AuthShell>
  );
}
