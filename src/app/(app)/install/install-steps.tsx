"use client";

import { useEffect, useState } from "react";
import { Share, Ellipsis, SquarePlus, Compass, EllipsisVertical, Check } from "lucide-react";
import { detectInAppBrowser, detectPlatform, isStandalone, type InstallPlatform } from "@/lib/install-prompt";

type Detected = { platform: InstallPlatform; inApp: string | null; installed: boolean };

/** An icon drawn inline with the text, so "tap Share" shows exactly what to look for. */
function Ico({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 align-middle px-1.5 py-0.5 mx-0.5 border border-line bg-char-2 text-bone text-[13px] font-semibold whitespace-nowrap">
      {children}
      <span>{label}</span>
    </span>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3 text-mute text-[15px]">
      {items.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="disp text-rec text-lg leading-6 w-5 flex-shrink-0">{i + 1}</span>
          <span className="leading-7">{step}</span>
        </li>
      ))}
    </ol>
  );
}

const IOS_STEPS = [
  <>Open <strong className="text-bone">catchmyactions.com</strong> in <Ico label="Safari"><Compass className="w-3.5 h-3.5" aria-hidden="true" /></Ico>.</>,
  <>Tap <Ico label="Share"><Share className="w-3.5 h-3.5" aria-hidden="true" /></Ico> (a square with an arrow up). Don&apos;t see it at the bottom? Tap <Ico label="More"><Ellipsis className="w-3.5 h-3.5" aria-hidden="true" /></Ico> first, then Share.</>,
  <>Scroll the list down and tap <Ico label="Add to Home Screen"><SquarePlus className="w-3.5 h-3.5" aria-hidden="true" /></Ico>. Not in the list? Tap <strong className="text-bone">View More</strong> or <strong className="text-bone">Edit Actions</strong> at the very bottom.</>,
  <>Keep <strong className="text-bone">Open as Web App</strong> on if you see it, then tap <strong className="text-bone">Add</strong>. The CatchMyAction icon appears on your home screen.</>,
];

const ANDROID_STEPS = [
  <>Open <strong className="text-bone">catchmyactions.com</strong> in <strong className="text-bone">Chrome</strong>.</>,
  <>Tap <Ico label="Menu"><EllipsisVertical className="w-3.5 h-3.5" aria-hidden="true" /></Ico> at the top right.</>,
  <>Tap <strong className="text-bone">Install app</strong> (or <strong className="text-bone">Add to Home screen</strong>), then <strong className="text-bone">Install</strong>.</>,
];

/** Install steps tailored to the device the page is opened on; everything is shown before detection runs. */
export default function InstallSteps() {
  const [d, setD] = useState<Detected | null>(null);

  useEffect(() => {
    setD({
      platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
      inApp: detectInAppBrowser(navigator.userAgent),
      installed: isStandalone(
        window.matchMedia("(display-mode: standalone)").matches,
        (navigator as Navigator & { standalone?: boolean }).standalone
      ),
    });
  }, []);

  if (d?.installed) {
    return (
      <p className="text-bone inline-flex items-center gap-2">
        <Check className="w-4 h-4 text-rec" aria-hidden="true" /> You&apos;re already using the installed app.
      </p>
    );
  }

  const showIos = !d || d.platform === "ios" || d.platform === "other";
  const showAndroid = !d || d.platform === "android" || d.platform === "other";

  return (
    <div className="space-y-10">
      {d?.inApp && (
        <div role="alert" className="bg-ink border border-line border-l-2 border-l-rec p-4">
          <p className="text-bone font-bold text-sm">You&apos;re in {d.inApp}&apos;s built-in browser</p>
          <p className="text-mute text-sm mt-1 leading-6">
            It can&apos;t add apps to the home screen. Tap <Ico label="More"><Ellipsis className="w-3.5 h-3.5" aria-hidden="true" /></Ico>
            {" "}(usually top right) and choose <strong className="text-bone">Open in {d.platform === "android" ? "Chrome" : "Safari"}</strong> or
            {" "}<strong className="text-bone">Open in browser</strong>, then follow the steps below.
          </p>
        </div>
      )}

      {d?.platform === "other" && (
        <p className="text-mute text-[15px]">
          This is for your phone. Open <strong className="text-bone">catchmyactions.com</strong> there and follow the steps.
        </p>
      )}

      {showIos && (
        <section aria-labelledby="ios-heading">
          <h2 id="ios-heading" className="hud mb-4">iPhone</h2>
          <Steps items={IOS_STEPS} />
        </section>
      )}

      {showAndroid && (
        <section aria-labelledby="android-heading">
          <h2 id="android-heading" className="hud mb-4">Android</h2>
          <Steps items={ANDROID_STEPS} />
        </section>
      )}
    </div>
  );
}
