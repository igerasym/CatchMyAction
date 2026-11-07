/** Helpers for the "add to home screen" prompt. Pure functions, so the rules are easy to test. */

export const DISMISS_KEY = "cma-install-dismissed";

export type InstallPlatform = "ios" | "android" | "other";

/** iPhone and iPad. iPadOS 13+ reports as Mac, so check touch points too. */
export function detectPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/** True when the app already runs as an installed app, so the banner has no point. */
export function isStandalone(matchMediaStandalone: boolean, iosStandalone?: boolean): boolean {
  return matchMediaStandalone || iosStandalone === true;
}

/** Show the banner unless it is already installed or the user dismissed it. */
export function shouldShowBanner(opts: {
  standalone: boolean;
  dismissed: boolean;
  platform: InstallPlatform;
  hasNativePrompt: boolean;
}): boolean {
  if (opts.standalone || opts.dismissed) return false;
  // Android needs the browser's own prompt to be available. On iOS there is no prompt,
  // so the banner is the only hint, and it shows instructions instead.
  if (opts.platform === "android") return opts.hasNativePrompt;
  return opts.platform === "ios";
}
