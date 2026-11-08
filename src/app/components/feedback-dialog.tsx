"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Loader2, X } from "lucide-react";
import {
  FEEDBACK_LABEL,
  FEEDBACK_TYPES,
  MAX_MESSAGE,
  OPEN_FEEDBACK,
  type FeedbackType,
  type OpenFeedbackDetail,
} from "@/lib/feedback-types";

const HINT: Record<FeedbackType, string> = {
  bug: "What happened, and what did you expect?",
  idea: "What would make CatchMyAction better for you?",
  question: "What would you like to know?",
};

/**
 * The one Feedback dialog of the site. It is mounted once in the layout and opened from any button
 * with openFeedback(), so it keeps working when the button that opened it (a menu item) goes away.
 */
export default function FeedbackDialog() {
  const { data: session } = useSession();
  const accountEmail = (session?.user as { email?: string } | undefined)?.email ?? null;

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState(""); // hidden field, only bots fill it
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      const d = (e as CustomEvent<OpenFeedbackDetail | undefined>).detail;
      setType(d?.type ?? "bug");
      setMessage(d?.message ?? "");
      setError("");
      setDone(false);
      setOpen(true);
    }
    window.addEventListener(OPEN_FEEDBACK, onOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    textRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sending]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message,
          email: accountEmail ? "" : email,
          website: trap,
          path: window.location.pathname,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not send that. Please try again.");
        return;
      }
      setDone(true);
      setMessage("");
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const label = "hud block mb-2";
  const field =
    "w-full bg-ink border border-line px-3 py-3 text-[15px] text-bone placeholder:text-dim focus:outline-none focus:border-bone";

  return (
    <div
      className="fixed inset-0 bg-ink/90 z-[70] flex items-end sm:items-center justify-center sm:p-4"
      onClick={() => !sending && setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="relative bg-char-2 border border-line w-full sm:max-w-md p-6 pb-8 sm:pb-6 max-h-[100dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {!sending && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-3 right-3 w-10 h-10 grid place-items-center text-mute hover:text-bone transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {done ? (
          <div role="status" className="py-4">
            <span className="w-12 h-12 grid place-items-center bg-rec text-rec-ink mb-5">
              <Check className="w-6 h-6" strokeWidth={3} aria-hidden="true" />
            </span>
            <h2 id="feedback-title" className="disp text-[28px] text-bone mb-2">
              Thank you<span className="text-rec">.</span>
            </h2>
            <p className="text-sm text-mute leading-relaxed mb-6">
              We read every message. If you left an email, we may write back.
            </p>
            <button type="button" onClick={() => setOpen(false)} className="btn-pri w-full justify-center">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="hud mb-3 flex items-center gap-2">
              <span className="rec-dot" aria-hidden="true" />
              Feedback
            </p>
            <h2 id="feedback-title" className="disp text-[28px] text-bone mb-5">
              Tell us<span className="text-rec">.</span>
            </h2>

            <fieldset className="mb-5">
              <legend className={label}>What is it?</legend>
              <div className="grid grid-cols-3 gap-2">
                {FEEDBACK_TYPES.map((t) => (
                  <label key={t} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="feedback-type"
                      value={t}
                      checked={type === t}
                      onChange={() => setType(t)}
                      className="peer sr-only"
                    />
                    <span className="block text-center px-2 py-2.5 text-sm font-semibold border border-line text-mute transition-colors peer-checked:bg-rec peer-checked:text-rec-ink peer-checked:border-rec peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bone">
                      {FEEDBACK_LABEL[t]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mb-5">
              <label htmlFor="feedback-message" className={label}>
                Message
              </label>
              <textarea
                id="feedback-message"
                ref={textRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX_MESSAGE}
                rows={5}
                placeholder={HINT[type]}
                className={`${field} resize-y`}
              />
              <p className="text-right text-[11px] font-mono text-dim mt-1" aria-hidden="true">
                {message.length}/{MAX_MESSAGE}
              </p>
            </div>

            {accountEmail ? (
              <p className="text-xs text-mute mb-5">
                We reply to <span className="text-bone">{accountEmail}</span>.
              </p>
            ) : (
              <div className="mb-5">
                <label htmlFor="feedback-email" className={label}>
                  Email (optional, so we can reply)
                </label>
                <input
                  id="feedback-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={field}
                />
              </div>
            )}

            {/* Honeypot: invisible and unreachable for people */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
              </label>
            </div>

            {error && (
              <div role="alert" className="text-sm text-bone p-3 border-l-2 border-rec bg-ink mb-4">
                {error}
              </div>
            )}

            <button type="submit" disabled={sending} className="btn-rec w-full justify-center disabled:opacity-60">
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Sending…
                </>
              ) : (
                "Send"
              )}
            </button>
            <p className="text-[11px] text-dim mt-3 leading-snug">
              We store your message, the page you were on and your browser type. See{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-bone">
                Privacy
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
