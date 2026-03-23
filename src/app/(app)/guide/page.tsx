import { Camera, Target, Scissors, DollarSign, Users, Zap, ImageIcon, TrendingUp } from "lucide-react";

export default function PhotographerGuidePage() {
  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-3">Photographer Guide</h1>
        <p className="text-white/50 text-lg">Sell more. Shoot smarter. Build your reputation.</p>
      </div>

      <Section
        icon={<Target className="w-5 h-5" />}
        title="The Golden Rule: Quality Over Quantity"
        color="ocean"
      >
        <p>
          Athletes scroll through your gallery in seconds. If they see 200 blurry shots, they leave.
          If they see 20 sharp, well-composed moments — they buy.
        </p>
        <Tip>
          Upload your best 15–30 photos per session. Delete the rest before uploading.
          A curated gallery converts 3–5x better than a photo dump.
        </Tip>
      </Section>

      <Section
        icon={<Camera className="w-5 h-5" />}
        title="What Sells"
        color="green"
      >
        <ul className="space-y-3">
          <Li>Faces visible and in focus — people buy photos where they can recognize themselves</Li>
          <Li>Peak action moments — the turn, the jump, the sprint finish, not the walk back</Li>
          <Li>Clean backgrounds — ocean, sky, track. Avoid cluttered scenes</Li>
          <Li>Good light — golden hour shots sell 2x more than midday harsh light</Li>
          <Li>Emotion — the celebration, the effort, the wipeout. People buy feelings</Li>
        </ul>
      </Section>

      <Section
        icon={<Scissors className="w-5 h-5" />}
        title="Before You Upload"
        color="purple"
      >
        <ul className="space-y-3">
          <Li>Cull ruthlessly — if you shot 500, upload 20–30 best. Not 500</Li>
          <Li>Basic edit — exposure, contrast, crop. Don't over-filter</Li>
          <Li>Straighten horizons — tilted ocean = instant skip</Li>
          <Li>Remove duplicates — 5 shots of the same wave? Pick the one</Li>
          <Li>Check sharpness at 100% — if it's soft, don't upload it</Li>
        </ul>
        <Tip>
          Think of it like a portfolio, not a hard drive backup.
          Every photo in your session should be one you'd put on your website.
        </Tip>
      </Section>

      <Section
        icon={<DollarSign className="w-5 h-5" />}
        title="Pricing That Works"
        color="yellow"
      >
        <ul className="space-y-3">
          <Li>$5–$10 for casual sessions (beach days, park sessions)</Li>
          <Li>$10–$20 for competitions and events</Li>
          <Li>$15–$30 for professional-grade action shots (big waves, aerial, moto)</Li>
        </ul>
        <p className="mt-3">
          Lower prices = more sales. Higher prices = more per sale. Start at $7–$10 and adjust based on what sells.
          You keep 82% of every sale.
        </p>
      </Section>

      <Section
        icon={<Users className="w-5 h-5" />}
        title="Get Athletes to Find You"
        color="ocean"
      >
        <ul className="space-y-3">
          <Li>Print the QR code and show it at the spot — tape it to your car, hold it up after the session</Li>
          <Li>Share the session link on local surf/skate/run groups</Li>
          <Li>Tag the location accurately — athletes search by spot name</Li>
          <Li>Upload within 24 hours — excitement fades fast</Li>
          <Li>Write a short description — "6ft swell, offshore winds, morning glass" helps athletes find the right session</Li>
        </ul>
      </Section>

      <Section
        icon={<Zap className="w-5 h-5" />}
        title="Session Setup Tips"
        color="green"
      >
        <ul className="space-y-3">
          <Li>Title it clearly — "Pipeline Morning Session" not "Session 47"</Li>
          <Li>Set accurate date and time — athletes remember when they were there</Li>
          <Li>Choose the right sport type — it helps with search and conditions data</Li>
          <Li>Set a cover photo — the first impression in the explore feed</Li>
        </ul>
      </Section>

      <Section
        icon={<ImageIcon className="w-5 h-5" />}
        title="Technical Requirements"
        color="purple"
      >
        <ul className="space-y-3">
          <Li>JPEG format, minimum 1200px on the shortest side</Li>
          <Li>Maximum 25MB per photo</Li>
          <Li>Photos are automatically watermarked — upload the original, we handle the rest</Li>
          <Li>EXIF data (camera, time, GPS) is extracted automatically if present</Li>
          <Li>Duplicates are detected by content — no double uploads</Li>
        </ul>
      </Section>

      <Section
        icon={<TrendingUp className="w-5 h-5" />}
        title="Build Your Reputation"
        color="yellow"
      >
        <ul className="space-y-3">
          <Li>Complete your profile — add bio, avatar, social links. Athletes check who shot the photos</Li>
          <Li>Be consistent — shoot the same spots regularly. Locals will start looking for you</Li>
          <Li>Respond to the market — if marathon photos sell well in your area, shoot more marathons</Li>
          <Li>Connect Stripe early — don't miss sales because payouts aren't set up</Li>
        </ul>
        <Tip>
          The photographers who sell the most aren't always the best shooters.
          They're the ones who show up consistently, upload fast, and curate well.
        </Tip>
      </Section>
    </div>
  );
}

function Section({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    ocean: "bg-ocean-500/10 border-ocean-500/20 text-ocean-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  };
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="text-sm text-white/50 leading-relaxed pl-[52px]">
        {children}
      </div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-ocean-400/60 mt-0.5 flex-shrink-0">›</span>
      <span>{children}</span>
    </li>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 px-4 py-3 bg-ocean-500/5 border border-ocean-500/10 rounded-xl text-xs text-ocean-300/80 leading-relaxed">
      <span className="font-medium text-ocean-400">Pro tip:</span> {children}
    </div>
  );
}
