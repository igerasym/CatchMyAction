/**
 * Viewfinder UI primitives shared by the (app) pages (auth, dashboard, settings, upload...).
 * Presentation only — see docs/DESIGN_SYSTEM.md.
 */
import type { ReactNode } from "react";

/** Text input / select / textarea. Square, ink well, hairline, bone focus. */
export const INPUT =
  "w-full px-3.5 py-3 bg-ink border border-line text-bone text-[15px] placeholder:text-dim focus:border-bone focus:outline-none disabled:opacity-50";

/** Field label (associate with htmlFor/id). */
export const LABEL = "hud block mb-2";

/** Helper text under a field. */
export const HINT = "font-mono text-[11px] tracking-[0.06em] text-dim mt-2";

/** Raised panel replacing old rounded `bg-white/5` cards. */
export const PANEL = "bg-char-2 border border-line";

/** Small inline link. */
export const LINK = "text-bone underline underline-offset-4 decoration-line hover:text-rec hover:decoration-rec transition-colors";

/** Square checkbox styled for the dark theme. */
export const CHECKBOX = "w-4 h-4 accent-[#ff4433] bg-ink border-line";

/** Section intro: `.hud` kicker + `.disp` title ending in a rec period. */
export function PageIntro({
  kicker,
  title,
  children,
  as: Tag = "h1",
  className = "",
}: {
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <header className={className}>
      <p className="hud mb-5">{kicker}</p>
      <Tag className="disp text-[clamp(34px,5vw,60px)] text-bone">
        {title}
        <span className="text-rec">.</span>
      </Tag>
      {children && <div className="mt-4 text-mute max-w-2xl">{children}</div>}
    </header>
  );
}

/** Inline status message. `rec` = error / needs attention, `ok` = neutral confirmation. */
export function Notice({ tone = "rec", children, className = "" }: { tone?: "rec" | "ok"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "rec" ? "alert" : "status"}
      className={`bg-ink border border-line border-l-2 ${tone === "rec" ? "border-l-rec" : "border-l-bone"} text-bone text-sm px-4 py-3 ${className}`}
    >
      {children}
    </div>
  );
}

/** Centered narrow column with a focus-bracket frame panel (auth pages). */
export function AuthShell({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <div className="max-w-md mx-auto mt-10 md:mt-16 mb-16">
      <div className="relative bg-char-2 border border-line px-6 py-9 sm:px-9">
        <div className="brk brk-sm" aria-hidden="true" />
        <p className="hud mb-5">{kicker}</p>
        <h1 className="disp text-[clamp(34px,6vw,48px)] text-bone mb-8">
          {title}
          <span className="text-rec">.</span>
        </h1>
        {children}
      </div>
    </div>
  );
}
