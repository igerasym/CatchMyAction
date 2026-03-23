"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function ComingSoon({ sessionId }: { sessionId: string }) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";

  const [email, setEmail] = useState(userEmail);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/sessions/${sessionId}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) setSubscribed(true);
    else setError("Something went wrong");
  }

  return (
    <div className="text-center py-16">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-2xl bg-ocean-500/10 border border-ocean-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-ocean-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="6" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 6V5a1 1 0 011-1h6a1 1 0 011 1v1" />
          </svg>
        </div>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Photos Coming Soon</h2>
      <p className="text-white/40 mb-8 max-w-md mx-auto">
        The photographer is still shooting or processing photos.
        Get notified when they&apos;re ready!
      </p>

      {subscribed ? (
        <div className="inline-flex items-center gap-2 px-5 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          ✓ We&apos;ll email you when photos are uploaded
        </div>
      ) : (
        <form onSubmit={handleNotify} className="max-w-sm mx-auto flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-ocean-500 focus:border-transparent placeholder-white/25"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 disabled:opacity-50 transition-colors text-sm whitespace-nowrap"
          >
            {loading ? "..." : "Notify Me"}
          </button>
        </form>
      )}
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </div>
  );
}
