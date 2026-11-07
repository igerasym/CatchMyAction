"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  DISMISS_KEY,
  canInstall,
  detectPlatform,
  isStandalone,
  shouldShowBanner,
  type InstallPlatform,
} from "@/lib/install-prompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Offers to add CatchMyAction to the home screen. Android gets a button, iPhone gets steps. */
export default function InstallBanner() {
  const { data: session } = useSession();
  const eligible = canInstall((session?.user as { role?: string } | undefined)?.role);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  // A ref, not state: the timer below must read the latest prompt, not the value from first render.
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // The browser fires beforeinstallprompt once, often before the session has loaded.
  // Always listen, so the event is never missed while we are still finding out the role.
  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent, navigator.maxTouchPoints));
    const onPrompt = (e: Event) => {
      e.preventDefault(); // hold it back, so our own button can trigger the install
      promptRef.current = e as BeforeInstallPromptEvent;
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // Decide whether to show once we know the role. Android may deliver the prompt shortly after load.
  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    const detected = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
    const standalone = isStandalone(
      window.matchMedia("(display-mode: standalone)").matches,
      (navigator as Navigator & { standalone?: boolean }).standalone
    );
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const t = setTimeout(() => {
      setVisible(
        shouldShowBanner({ standalone, dismissed, platform: detected, hasNativePrompt: promptRef.current !== null })
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [eligible]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferred(null);
    promptRef.current = null;
  }

  if (!eligible || !visible) return null;

  return (
    <div role="dialog" aria-label="Add CatchMyAction to your home screen"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md border border-line bg-char-2 p-4 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-bone font-bold text-sm">Upload faster from your home screen</p>
          {platform === "ios" ? (
            <p className="text-mute text-sm mt-1">
              Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>. It opens full-screen, like an app.
            </p>
          ) : (
            <p className="text-mute text-sm mt-1">Open it full-screen, straight from your home screen.</p>
          )}
        </div>
        <button onClick={dismiss} aria-label="Close" className="hud hover:text-bone px-1">×</button>
      </div>
      {platform === "android" && deferred && (
        <button onClick={install} className="btn-pri mt-3 w-full justify-center py-2.5 text-sm">
          Install app
        </button>
      )}
    </div>
  );
}
