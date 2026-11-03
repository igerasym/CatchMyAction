"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, Check } from "lucide-react";

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
    <section className="relative bg-char-2 px-6 py-12 sm:py-16 text-center">
      <span aria-hidden="true" className="brk brk-soft brk-sm" />
      <div className="flex justify-center mb-6">
        <div className="relative w-16 h-16 grid place-items-center bg-ink">
          <span aria-hidden="true" className="brk brk-sm" style={{ ["--l" as any]: "8px" }} />
          <Camera className="w-7 h-7 text-bone" strokeWidth={1.6} aria-hidden="true" />
        </div>
      </div>
      <p className="hud mb-3 flex items-center justify-center gap-2">
        <span className="rec-dot blink" aria-hidden="true" />
        Processing
      </p>
      <h2 className="disp text-bone text-[clamp(30px,8vw,44px)] mb-3">
        Photos coming soon<span className="text-rec">.</span>
      </h2>
      <p className="text-mute mb-8 max-w-md mx-auto">
        The photographer is still shooting or processing photos.
        Get notified when they&apos;re ready.
      </p>

      {subscribed ? (
        <p role="status" className="inline-flex items-center gap-2 px-5 py-3 bg-ink border border-line text-bone text-sm">
          <Check className="w-4 h-4 text-rec" aria-hidden="true" />
          We&apos;ll email you when photos are uploaded
        </p>
      ) : (
        <form onSubmit={handleNotify} className="max-w-sm mx-auto text-left">
          <label htmlFor="notify-email" className="hud block mb-2">Your email</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="notify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="flex-1 min-w-0 bg-ink border border-line text-bone placeholder:text-dim px-3.5 py-3 text-sm focus:border-bone focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-pri justify-center !py-3 !text-sm whitespace-nowrap disabled:opacity-50"
            >
              {loading ? "Sending…" : "Notify me"}
            </button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-rec text-sm mt-3">{error}</p>}
    </section>
  );
}
