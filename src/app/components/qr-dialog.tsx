"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/toast";

interface QrDialogProps {
  kicker: string;
  title: string;
  subtitle: string;
  qrSrc: string;
  link: string;
  downloadName: string;
  footnote?: string;
  onClose: () => void;
}

/** QR modal shared by the dashboard and the session manage page: Esc / X / click-outside close, copy gives feedback. */
export default function QrDialog({ kicker, title, subtitle, qrSrc, link, downloadName, footnote, onClose }: QrDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Parents pass a fresh arrow every render; keep the effect (focus + listener) from re-running on each one
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toastSuccess("Link copied!");
    } catch {
      toastError("Couldn't copy the link. Select it and copy manually.");
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="relative bg-char-2 border border-line p-7 text-center max-w-sm w-full max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} onClick={onClose} aria-label="Close"
          className="absolute top-2 right-2 w-10 h-10 grid place-items-center text-bone hover:bg-char-3 transition-colors">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
        <p className="hud mb-3">QR / {kicker}</p>
        <h2 id={titleId} className="disp text-2xl text-bone mb-2">{title}<span className="text-rec">.</span></h2>
        <p className="text-sm text-mute mb-5">{subtitle}</p>
        <div className="bg-bone p-4 inline-block mb-4">
          <img src={qrSrc} alt="QR code" className="w-48 h-48" />
        </div>
        <p className="font-mono text-[11px] text-dim mb-5 break-all">{link}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={copy} className="btn-sec py-2.5 px-4 text-sm">Copy Link</button>
          <a href={qrSrc} download={downloadName} className="btn-pri py-2.5 px-4 text-sm">Download QR</a>
        </div>
        {footnote && <p className="font-mono text-[11px] text-dim mt-5">{footnote}</p>}
      </div>
    </div>
  );
}
