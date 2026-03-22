export default function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  const w = size * 1.33;
  const h = size;
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 48 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Focus rectangle corners */}
      <path d="M3 10V4a1 1 0 011-1h6" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M38 3h6a1 1 0 011 1v6" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M45 26v6a1 1 0 01-1 1h-6" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 33H4a1 1 0 01-1-1v-6" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Bold play triangle — centered, filled */}
      <path d="M18 9L35 18L18 27V9z" fill="url(#logoGrad)" />

      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="36">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
