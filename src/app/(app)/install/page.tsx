import type { Metadata } from "next";
import { PageIntro } from "../ui";
import InstallSteps from "./install-steps";

export const metadata: Metadata = {
  title: "Add to home screen",
  description: "Install CatchMyAction on your phone and open it full-screen, like an app.",
};

/** Permanent, always-available version of the install banner. The banner is one-time; this page is not. */
export default function InstallPage() {
  return (
    <div className="max-w-2xl mx-auto py-4 md:py-8">
      <PageIntro kicker="App" title="Add to home screen" className="mb-10 md:mb-12">
        Open CatchMyAction from an icon on your phone, full-screen like an app. No app store needed, takes 20 seconds.
      </PageIntro>

      <InstallSteps />
    </div>
  );
}
