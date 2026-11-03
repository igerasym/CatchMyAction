"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import PasswordInput from "@/app/components/password-input";
import Link from "next/link";
import { AuthShell, INPUT, LABEL, LINK, Notice } from "../ui";
import { safeCallbackUrl } from "@/lib/redirect";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const verified = searchParams.get("verified");
  const tokenError = searchParams.get("error");

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
      window.location.href = callbackUrl;
    }
  }

  return (
    <AuthShell kicker="01 / Account" title="Sign in">
      {verified && <Notice tone="ok" className="mb-5">Email verified. You can now sign in.</Notice>}
      {tokenError === "invalid-token" && <Notice className="mb-5">Invalid or expired verification link.</Notice>}
      {error && <Notice className="mb-5">{error}</Notice>}
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
