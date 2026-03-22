"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

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
    window.location.href = "/";
  }

  const inputClass = "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent";

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold text-center mb-6 text-white">Create account</h1>

      {success ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
          <p className="text-sm text-white/40 mb-4">
            We sent a verification link to your email. Click it to activate your account.
          </p>
          <Link href="/login" className="text-ocean-400 hover:underline text-sm">
            Go to Sign in
          </Link>
        </div>
      ) : (
        <>
      {error && (
        <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg mb-4 border border-red-500/20">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white/50 mb-1">Name</label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white/50 mb-1">Email</label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white/50 mb-1">Password</label>
          <input id="password" name="password" type="password" required minLength={8} className={inputClass} />
          <p className="text-[11px] text-white/20 mt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-white/50 mb-1">I am a...</label>
          <select id="role" name="role" className={inputClass}>
            <option value="USER">Surfer (browse & buy photos)</option>
            <option value="PHOTOGRAPHER">Photographer (upload & sell)</option>
          </select>
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-white/20 bg-white/5 text-ocean-500 focus:ring-ocean-500" />
          <span className="text-xs text-white/40 leading-relaxed">
            I agree to the{" "}
            <a href="/terms" target="_blank" className="text-ocean-400 hover:underline">Terms of Service</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" className="text-ocean-400 hover:underline">Privacy Policy</a>,
            including the use of facial recognition technology for photo matching.
          </span>
        </label>
        <button type="submit" disabled={loading || !agreed}
          className="w-full py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-40 transition-colors">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm text-white/40 mt-4">
        Already have an account?{" "}
        <Link href="/login" className="text-ocean-400 hover:underline">Sign in</Link>
      </p>
        </>
      )}
    </div>
  );
}
