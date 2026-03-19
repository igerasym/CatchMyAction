export default function HowItWorks() {
  const steps = [
    {
      icon: "📸",
      title: "Photographer Uploads",
      desc: "Surf photographers upload sessions tagged by spot, date, and time. Photos are auto-watermarked.",
    },
    {
      icon: "🔍",
      title: "Find Your Photos",
      desc: "Browse by location and date. You know when and where you surfed — find your session in seconds.",
    },
    {
      icon: "⬇️",
      title: "Buy HD Download",
      desc: "Found yourself? Purchase the high-resolution original. Instant download, no watermark.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-[#111]">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 text-white">
          How It Works
        </h2>
        <p className="text-white/40 text-center mb-12">
          From wave to wallpaper in 3 steps
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="text-center p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-ocean-500/30 transition-colors"
            >
              <div className="text-5xl mb-4">{step.icon}</div>
              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ocean-500/20 text-ocean-400 font-bold text-sm mb-3">
                {i + 1}
              </div>
              <h3 className="font-semibold text-lg mb-2 text-white">
                {step.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
