"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (sessionId) {
      // Payment was processed via webhook — just show success
      setStatus("success");
    } else {
      setStatus("error");
    }
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="text-center py-20" role="status">
        <p className="hud">Confirming your purchase...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-xl mx-auto py-16 md:py-24">
        <p className="hud mb-5"><span className="text-rec">ERR</span> / Purchase</p>
        <h1 className="disp text-[clamp(34px,5vw,56px)] text-bone mb-4">
          Something went wrong<span className="text-rec">.</span>
        </h1>
        <p className="text-mute">
          We couldn&apos;t confirm your purchase. Please contact support.
        </p>
        <a href="/" className="btn-sec mt-8">
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-16 md:py-24">
      <div className="relative bg-char-2 border border-line px-7 py-10 sm:px-10">
        <div className="brk brk-rec" aria-hidden="true" />
        <p className="hud mb-5 flex items-center gap-2"><span className="rec-dot" aria-hidden="true" /> Purchase / Complete</p>
        <h1 className="disp text-[clamp(34px,5vw,56px)] text-bone mb-4">
          Purchase complete<span className="text-rec">.</span>
        </h1>
        <p className="text-mute mb-2">
          Your high-resolution photo is ready for download.
        </p>
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-dim mb-8">
          You can download your photo from the session page (up to 5 times).
        </p>
        <a href="/" className="btn-pri">
          Browse more sessions
        </a>
      </div>
    </div>
  );
}
