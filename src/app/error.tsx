"use client";

import { useEffect } from "react";
import { openFeedback } from "@/lib/feedback-types";

/** Shown when a page crashes. Gives the visitor a retry and a one-tap way to tell us, with the error reference filled in. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error:", error.digest ?? error.name);
  }, [error]);

  return (
    <main className="max-w-md mx-auto px-5 py-24">
      <p className="hud mb-4 flex items-center gap-2">
        <span className="rec-dot" aria-hidden="true" /> Error
      </p>
      <h1 className="disp text-[clamp(32px,8vw,48px)] text-bone mb-3">
        Something broke<span className="text-rec">.</span>
      </h1>
      <p className="text-mute leading-relaxed mb-8">
        That was on our side. You can try again, or tell us what you were doing and we will fix it.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn-pri">
          Try again
        </button>
        <button
          type="button"
          onClick={() =>
            openFeedback({
              type: "bug",
              message: `The page broke${error.digest ? ` (ref ${error.digest})` : ""}.\n\nI was trying to: `,
            })
          }
          className="btn-sec"
        >
          Report this
        </button>
      </div>
    </main>
  );
}
