export default function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer lens ring */}
      <circle cx="20" cy="20" r="18" stroke="url(#grad)" strokeWidth="2.5" fill="none" />
      {/* Inner lens */}
      <circle cx="20" cy="20" r="12" stroke="url(#grad)" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Lightning bolt — action! */}
      <path
        d="M22 10L14 22h6l-2 8 8-12h-6l2-8z"
        fill="url(#grad)"
      />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
