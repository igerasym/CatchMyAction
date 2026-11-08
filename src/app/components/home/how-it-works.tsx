const STEPS = [
  {
    n: "01",
    title: "Photographers upload",
    body: "Every session is pinned to a spot, a date and a time. Water sessions show the sea conditions too.",
  },
  {
    n: "02",
    title: "You find yourself",
    body: "Scan the QR on the beach or pick the session, then take one selfie.",
  },
  {
    n: "03",
    title: "Buy & download",
    body: "Pay per photo, or download free from free sessions. You get the full-resolution file, no watermark, and only pay for the shots you keep.",
  },
];

/** Three steps on a lens focus-scale ruler. Step 02 ("you") is the only accent. */
export default function HowItWorks() {
  return (
    <section className="bg-ink px-5 md:px-12 py-20 md:py-28">
      <div className="max-w-[1320px] mx-auto grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <p className="hud mb-5">04 / How it works</p>
          <h2 className="disp text-[clamp(36px,4.6vw,64px)]">
            Lineup to
            <br />
            camera roll<span className="text-rec">.</span>
          </h2>
        </div>
        <ol className="lg:col-span-8 grid md:grid-cols-3 gap-8 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={s.n}>
              <div className="ticks mb-6" aria-hidden="true" />
              <span
                className={`disp text-[72px] md:text-[88px] ${i === 1 ? "text-rec" : "text-transparent"}`}
                style={i === 1 ? undefined : { WebkitTextStroke: "1.5px #b3ada3" }}
              >
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
