"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell, INPUT, LABEL, LINK } from "../ui";

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
    <AuthShell kicker="01 / Account" title="Reset password">
      {sent ? (
        <div className="py-4" role="status">
          <Mail className="w-8 h-8 text-rec mb-5" aria-hidden="true" />
          <p className="text-sm text-mute mb-6">If an account exists with that email, we sent a reset link. Check your inbox.</p>
          <Link href="/login" className="btn-sec">Back to Sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className={LABEL}>Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className={INPUT} />
          </div>
          <button type="submit" disabled={loading} className="btn-pri w-full justify-center disabled:opacity-50">
            {loading ? "Sending..." : "Send reset link"}
          </button>
          <p className="text-sm text-mute pt-5 border-t border-line">
            <Link href="/login" className={LINK}>Back to Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
