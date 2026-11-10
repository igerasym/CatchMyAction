const STEPS = [
  { n: "01", title: "Photographers shoot the session", body: "Every session is pinned to a spot and a time." },
  { n: "02", title: "You take one selfie", body: "We find every frame you're in. Your selfie isn't saved." },
  { n: "03", title: "Keep the frames you love", body: "Pay per photo, full resolution, no watermark. Free sessions download free." },
];

/** Three short steps on a focus-scale ruler. Step 02 ("you") is the only accent. */
export default function HowItWorks() {
  return (
    <section aria-label="How it works" className="bg-ink px-8 md:px-[72px] pt-16 md:pt-20 pb-6 md:pb-8">
      <ol className="max-w-[1320px] mx-auto grid md:grid-cols-3 gap-8 md:gap-10">
        {STEPS.map((s, i) => (
          <li key={s.n}>
            <div className="ticks" aria-hidden="true" />
            <p className={`mt-4 font-mono text-[13px] font-bold ${i === 1 ? "text-rec" : "text-dim"}`}>{s.n}</p>
            <h2 className="mt-1.5 text-xl font-bold text-bone">{s.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-mute max-w-xs">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
