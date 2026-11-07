import { sportIconPath } from "@/lib/sport-icons";

interface IconProps {
  sport: string;
  className?: string;
}

/** Bare sport pictogram in currentColor. Renders nothing for sports without one. */
export function SportIcon({ sport, className = "w-5 h-5" }: IconProps) {
  const d = sportIconPath(sport);
  if (!d) return null;
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

interface BadgeProps {
  sport: string;
  /** Tailwind size classes for the square badge. */
  size?: string;
  /** Accessible name; the sport is also spelled out as text next to it in most places. */
  label?: string;
}

/**
 * Sport pictogram inside viewfinder corner brackets, like the AF box locking on a subject.
 * Matches the focus-bracket frame used across the site.
 */
export function SportBadge({ sport, size = "w-9 h-9", label }: BadgeProps) {
  if (!sportIconPath(sport)) return null;
  return (
    <span
      className={`relative inline-grid place-items-center shrink-0 text-bone/90 ${size}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      title={label}
    >
      <span className="brk brk-xs brk-soft" aria-hidden="true" />
      <SportIcon sport={sport} className="w-[62%] h-[62%]" />
    </span>
  );
}
