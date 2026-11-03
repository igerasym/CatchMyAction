/** CatchMyAction mark: focus brackets (bone) around a REC-red play triangle. */
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
      aria-hidden="true"
    >
      <path d="M3 10V3h7" stroke="currentColor" strokeWidth="2.75" />
      <path d="M38 3h7v7" stroke="currentColor" strokeWidth="2.75" />
      <path d="M45 26v7h-7" stroke="currentColor" strokeWidth="2.75" />
      <path d="M10 33H3v-7" stroke="currentColor" strokeWidth="2.75" />
      <path d="M19 10L33 18L19 26V10z" fill="#ff4433" />
    </svg>
  );
}
