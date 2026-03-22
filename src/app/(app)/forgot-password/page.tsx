"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold text-center mb-6 text-white">Reset Password</h1>
      {sent ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📧</div>
          <p className="text-sm text-white/50 mb-4">If an account exists with that email, we sent a reset link. Check your inbox.</p>
          <Link href="/login" className="text-ocean-400 hover:underline text-sm">Back to Sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/50 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <p className="text-center text-sm text-white/40">
            <Link href="/login" className="text-ocean-400 hover:underline">Back to Sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
