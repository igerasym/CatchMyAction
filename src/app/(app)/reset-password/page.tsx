"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/app/components/password-input";
import { Check } from "lucide-react";
import { AuthShell, HINT, INPUT, LABEL, Notice } from "../ui";

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

  if (!token) return (
    <AuthShell kicker="01 / Account" title="Invalid link">
      <Notice>Invalid reset link</Notice>
    </AuthShell>
  );

  return (
    <AuthShell kicker="01 / Account" title="Set new password">
      {done ? (
        <div className="py-4" role="status">
          <Check className="w-8 h-8 text-rec mb-5" aria-hidden="true" />
          <p className="text-sm text-mute mb-6">Password reset successfully!</p>
          <Link href="/login" className="btn-pri">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Notice>{error}</Notice>}
          <div>
            <label htmlFor="new-password" className={LABEL}>New password</label>
            <PasswordInput id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              autoComplete="new-password" className={`${INPUT} pr-10`} />
            <p className={HINT}>Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
          </div>
          <button type="submit" disabled={loading} className="btn-pri w-full justify-center disabled:opacity-50">
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
