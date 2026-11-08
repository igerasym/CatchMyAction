import type { Metadata } from "next";
import { PageIntro } from "../ui";

export const metadata: Metadata = {
  title: "Add to home screen",
  description: "Install CatchMyAction on your phone and open it full-screen, like an app.",
};

/** Permanent, always-available version of the install banner. The banner is one-time; this page is not. */
export default function InstallPage() {
  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8">
      <PageIntro kicker="App" title="Add to home screen" className="mb-10 md:mb-12">
        Open CatchMyAction full-screen from your phone, no app store needed.
      </PageIntro>

      <section aria-labelledby="ios-heading" className="mb-10">
        <h2 id="ios-heading" className="hud mb-4">iPhone (Safari)</h2>
        <ol className="list-decimal pl-5 space-y-2 text-mute text-[15px]">
          <li>Open this site in <strong className="text-bone">Safari</strong>. It does not work from Chrome on iPhone.</li>
          <li>Tap the <strong className="text-bone">Share</strong> button (the square with an arrow) at the bottom.</li>
          <li>Scroll and tap <strong className="text-bone">Add to Home Screen</strong>.</li>
          <li>Tap <strong className="text-bone">Add</strong>. The icon appears on your home screen.</li>
        </ol>
      </section>

      <section aria-labelledby="android-heading" className="mb-10">
        <h2 id="android-heading" className="hud mb-4">Android (Chrome)</h2>
        <ol className="list-decimal pl-5 space-y-2 text-mute text-[15px]">
          <li>Open this site in <strong className="text-bone">Chrome</strong>.</li>
          <li>Tap the <strong className="text-bone">menu</strong> (three dots) and choose <strong className="text-bone">Install app</strong> or <strong className="text-bone">Add to Home screen</strong>.</li>
        </ol>
      </section>

      <section aria-labelledby="desktop-heading">
        <h2 id="desktop-heading" className="hud mb-4">Computer (Chrome or Edge)</h2>
        <p className="text-mute text-[15px]">Click the install icon at the right end of the address bar.</p>
      </section>
    </div>
  );
}
