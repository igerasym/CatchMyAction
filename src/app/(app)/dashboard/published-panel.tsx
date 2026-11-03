"use client";

import { useState } from "react";
import { Share2, Link2, QrCode, ExternalLink, Check, X } from "lucide-react";

/**
 * Shown right after a session is published: the moment a photographer most wants to share.
 * Share sheet (mobile) / copy link, QR, public page, and how many waiting athletes were emailed.
 */
export default function PublishedPanel({
  sessionId,
  title,
  notified,
  onClose,
}: {
  sessionId: string;
  title: string;
  notified: number;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/sessions/${sessionId}` : `/sessions/${sessionId}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function share() {
    try {
      await navigator.share({ title, text: `Photos from ${title} — find yourself with a selfie`, url });
    } catch {
      /* user cancelled */
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section role="status" aria-live="polite" className="relative mb-8 bg-ink p-6 md:p-8">
      <span aria-hidden="true" className="brk brk-rec" />
      <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 w-10 h-10 grid place-items-center text-mute hover:text-bone">
        <X className="w-5 h-5" aria-hidden="true" />
      </button>
      <p className="hud mb-3 flex items-center gap-2">
        <span className="rec-dot" aria-hidden="true" /> Live
      </p>
      <h2 className="disp text-[clamp(28px,4vw,44px)] text-bone">
        Your session is live<span className="text-rec">.</span>
      </h2>
      <p className="mt-3 text-mute max-w-xl">
        {notified > 0
          ? `We emailed ${notified} ${notified === 1 ? "person" : "people"} who asked to be notified. `
          : ""}
        Share the link or show the QR at the spot — athletes find themselves with a selfie.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {canShare && (
          <button onClick={share} className="btn-rec">
            <Share2 className="w-4 h-4" aria-hidden="true" /> Share
          </button>
        )}
        <button onClick={copy} className={canShare ? "btn-sec" : "btn-rec"}>
          {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Link2 className="w-4 h-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a href={`/api/sessions/${sessionId}/qr`} download={`session-${sessionId}-qr.svg`} className="btn-sec">
          <QrCode className="w-4 h-4" aria-hidden="true" /> Download QR
        </a>
        <a href={`/sessions/${sessionId}`} target="_blank" rel="noopener noreferrer" className="btn-sec">
          <ExternalLink className="w-4 h-4" aria-hidden="true" /> View public page
        </a>
      </div>
    </section>
  );
}
