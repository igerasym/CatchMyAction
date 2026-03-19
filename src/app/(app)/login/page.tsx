"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/";

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
    if (res?.error) setError("Invalid email or password");
    else { window.location.href = callbackUrl; }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold text-center mb-6 text-white">Sign in</h1>
      {error && (
        <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg mb-4 border border-red-500/20">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white/50 mb-1">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white/50 mb-1">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-white/40 mt-4">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-ocean-400 hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
