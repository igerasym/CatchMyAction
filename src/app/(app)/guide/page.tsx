import { Camera, Target, Scissors, DollarSign, Users, Zap, ImageIcon, TrendingUp, Wallet } from "lucide-react";

export default function PhotographerGuidePage() {
  return (
    <div className="max-w-3xl mx-auto py-12 md:py-16">
      <div className="mb-12">
        <p className="hud mb-5">Guide / For photographers</p>
        <h1 className="disp text-[clamp(34px,5vw,60px)] text-bone mb-4">Photographer guide<span className="text-rec">.</span></h1>
        <p className="text-mute text-lg">Sell more. Shoot smarter. Build your reputation.</p>
      </div>

      <FirstSession />

      <Section
        icon={<Target className="w-5 h-5" aria-hidden="true" />}
        title="The Golden Rule: Quality Over Quantity"
      >
        <p>
          Athletes scroll through your gallery in seconds. If they see 200 blurry shots, they leave.
          If they see 20 sharp, well-composed moments — they buy.
        </p>
        <Tip>
          Upload your best 15–30 photos per session. Delete the rest before uploading.
          The session limits (200 photos, 50 for a free session) are a ceiling, not a target.
          A short, curated gallery is easier to buy from than a photo dump.
        </Tip>
      </Section>

      <Section
        icon={<Camera className="w-5 h-5" aria-hidden="true" />}
        title="What Sells"
      >
        <ul className="space-y-3">
          <Li>Faces visible and in focus — people buy photos where they can recognize themselves</Li>
          <Li>Peak action moments — the turn, the jump, the sprint finish, not the walk back</Li>
          <Li>Clean backgrounds — ocean, sky, track. Avoid cluttered scenes</Li>
          <Li>Good light — soft morning and evening light usually looks better than harsh midday sun</Li>
          <Li>Emotion — the celebration, the effort, the wipeout. People buy feelings</Li>
        </ul>
      </Section>

      <Section
        icon={<Scissors className="w-5 h-5" aria-hidden="true" />}
        title="Before You Upload"
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
        icon={<DollarSign className="w-5 h-5" aria-hidden="true" />}
        title="Pricing That Works"
      >
        <ul className="space-y-3">
          <Li>$5–$10 for casual sessions (beach days, park sessions)</Li>
          <Li>$10–$20 for competitions and events</Li>
          <Li>$15–$30 for professional-grade action shots (big waves, aerial, moto)</Li>
        </ul>
        <p className="mt-3">
          Lower prices = more sales. Higher prices = more per sale. Start at $7–$10 and adjust based on what sells.
          Your first 5 sales are commission-free, after that you keep 82% of every sale.
          See <a href="#get-paid" className="text-bone underline underline-offset-4 decoration-line hover:text-rec hover:decoration-rec transition-colors">how you get paid</a>.
        </p>
      </Section>

      <Section
        id="get-paid"
        icon={<Wallet className="w-5 h-5" aria-hidden="true" />}
        title="How You Get Paid"
      >
        <ul className="space-y-3">
          <Li>
            Your first 5 sales are commission-free: CatchMyAction takes nothing, only the card processing fee is deducted
            (about 2.9% + $0.30 per checkout). On a $10 photo you get about $9.41.
          </Li>
          <Li>After that you keep 82% of every sale. CatchMyAction keeps 18%, and card processing fees are on us.</Li>
          <Li>
            With Stripe connected, your share is sent to your Stripe account at the moment of each sale.
            Stripe pays it out to your bank on your Stripe payout schedule, which you can see in your Stripe dashboard.
          </Li>
          <Li>
            Sold before connecting Stripe? Those sales are kept for you and shown as &ldquo;Waiting for Stripe&rdquo; in your dashboard.
            Once your Stripe account is active, we send them to it the next time you open your dashboard.
          </Li>
          <Li>Free sessions: athletes download for free, nothing is charged.</Li>
        </ul>
      </Section>

      <Section
        icon={<Users className="w-5 h-5" aria-hidden="true" />}
        title="Get Athletes to Find You"
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
        icon={<Zap className="w-5 h-5" aria-hidden="true" />}
        title="Session Setup Tips"
      >
        <ul className="space-y-3">
          <Li>Title it clearly — "Pipeline Morning Session" not "Session 47"</Li>
          <Li>Set accurate date and time — athletes remember when they were there</Li>
          <Li>Choose the right sport type — it helps with search and conditions data</Li>
          <Li>Set a cover photo — the first impression in the explore feed</Li>
        </ul>
      </Section>

      <Section
        icon={<ImageIcon className="w-5 h-5" aria-hidden="true" />}
        title="Technical Requirements"
      >
        <ul className="space-y-3">
          <Li>JPEG, PNG or WebP, at least 1200px on the shortest side</Li>
          <Li>Maximum 25MB per photo. Very narrow crops (longer than 5:1) are rejected</Li>
          <Li>Up to 200 photos per session. Free sessions take up to 50: set a price to upload more</Li>
          <Li>Photos are automatically watermarked — upload the original, we handle the rest. Buyers download your original file, without the watermark</Li>
          <Li>Uploading the exact same file twice to one session is skipped</Li>
          <Li>Photos with prohibited content are rejected automatically</Li>
        </ul>
      </Section>

      <Section
        icon={<TrendingUp className="w-5 h-5" aria-hidden="true" />}
        title="Build Your Reputation"
      >
        <ul className="space-y-3">
          <Li>Complete your profile — add bio, avatar, social links. Athletes check who shot the photos</Li>
          <Li>Be consistent — shoot the same spots regularly. Locals will start looking for you</Li>
          <Li>Respond to the market — if marathon photos sell well in your area, shoot more marathons</Li>
          <Li>Connect Stripe early, so your share is sent to you at the moment of each sale instead of waiting</Li>
        </ul>
        <Tip>
          The photographers who sell the most aren't always the best shooters.
          They're the ones who show up consistently, upload fast, and curate well.
        </Tip>
      </Section>
    </div>
  );
}

/** Step-by-step onboarding. Labels in quotes match the real buttons/fields on those pages. */
const FIRST_STEPS: { title: string; body: React.ReactNode; href: string; cta: string }[] = [
  {
    title: "Create a photographer account",
    body: <>Sign up and choose &ldquo;I shoot photos&rdquo;. Confirm your email: you need it to publish sessions.</>,
    href: "/register?role=photographer",
    cta: "Create account",
  },
  {
    title: "Connect Stripe to get paid",
    body: <>In Settings, open the Payouts section and tap &ldquo;Connect Stripe Account&rdquo;. Stripe asks for your details and bank account.</>,
    href: "/settings",
    cta: "Open Settings",
  },
  {
    title: "Create a session and upload",
    body: (
      <ul className="space-y-1.5">
        <Li>Give it a clear title.</Li>
        <Li>Spot: pick one of the suggestions, so the session lands on the map with the right sea conditions.</Li>
        <Li>Date, start and end time, in the spot&apos;s local time.</Li>
        <Li>Sport, then a price per photo, or tick &ldquo;Free session&rdquo;.</Li>
        <Li>Add photos: JPEG, PNG or WebP, at least 1200px on the short side, up to 25MB each. Up to 200 photos per session, 50 for a free session. Then tap &ldquo;Publish Session&rdquo;.</Li>
      </ul>
    ),
    href: "/upload",
    cta: "Create a session",
  },
  {
    title: "Share it",
    body: <>In your dashboard, every session has a &ldquo;QR Code&rdquo; and &ldquo;Copy Link&rdquo; in its menu, and your profile has its own QR code. Show or print the QR at the spot, and post the link in local groups.</>,
    href: "/dashboard",
    cta: "Open dashboard",
  },
  {
    title: "Upload from your phone",
    body: <>Add CatchMyAction to your home screen and open it full-screen, like an app. Handy for uploading straight from the beach.</>,
    href: "/install",
    cta: "Add to home screen",
  },
];

function FirstSession() {
  return (
    <section aria-labelledby="first-session-heading" className="border-t border-line pt-6 pb-10">
      <p className="hud mb-3">Start here</p>
      <h2 id="first-session-heading" className="disp text-[clamp(26px,3.6vw,38px)] text-bone mb-6">
        Your first session in 5 steps<span className="text-rec">.</span>
      </h2>
      <ol className="space-y-4">
        {FIRST_STEPS.map((s, i) => (
          <li key={s.title} className="relative bg-char-2 border border-line p-5 sm:p-6">
            <div className="flex gap-4">
              <span className="font-mono text-sm text-rec pt-0.5 flex-shrink-0" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-bone mb-2">
                  <span className="sr-only">Step {i + 1}: </span>{s.title}
                </h3>
                <div className="text-[15px] text-mute leading-relaxed">{s.body}</div>
                <a href={s.href} className="btn-sec text-sm py-2.5 px-4 mt-4">{s.cta} →</a>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Section({ id, icon, title, children }: {
  id?: string; icon: React.ReactNode; title: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line pt-6 pb-10 scroll-mt-20">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 border border-line bg-char-2 flex items-center justify-center text-bone">
          {icon}
        </div>
        <h2 className="text-lg font-bold text-bone">{title}</h2>
      </div>
      <div className="text-[15px] text-mute leading-relaxed sm:pl-[52px]">
        {children}
      </div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="text-rec mt-0.5 flex-shrink-0 font-mono" aria-hidden="true">›</span>
      <span>{children}</span>
    </li>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 px-4 py-3 bg-ink border border-line border-l-2 border-l-rec text-sm text-mute leading-relaxed">
      <span className="hud text-rec mr-2">Pro tip</span> {children}
    </div>
  );
}
