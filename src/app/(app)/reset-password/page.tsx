"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/app/components/password-input";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.reset) setDone(true);
    else setError(data.error || "Reset failed");
  }

  if (!token) return <p className="text-center py-16 text-red-400">Invalid reset link</p>;

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold text-center mb-6 text-white">Set New Password</h1>
      {done ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✓</div>
          <p className="text-sm text-white/50 mb-4">Password reset successfully!</p>
          <Link href="/login" className="px-6 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm inline-block">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-white/50 mb-1">New Password</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
            <p className="text-[11px] text-white/20 mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors">
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}
