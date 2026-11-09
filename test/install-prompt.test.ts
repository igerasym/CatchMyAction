import { describe, expect, it } from "vitest";
import { canInstall, detectInAppBrowser, detectPlatform, isStandalone, shouldShowBanner } from "@/lib/install-prompt";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const IPAD_DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";

describe("detectPlatform", () => {
  it("detects iPhone and Android", () => {
    expect(detectPlatform(IPHONE)).toBe("ios");
    expect(detectPlatform(ANDROID)).toBe("android");
  });

  it("detects iPad that reports itself as Mac (touch points present)", () => {
    expect(detectPlatform(IPAD_DESKTOP_UA, 5)).toBe("ios");
  });

  it("does not mistake a real Mac for iOS", () => {
    expect(detectPlatform(MAC, 0)).toBe("other");
  });
});

describe("isStandalone", () => {
  it("is true when display-mode is standalone or iOS reports standalone", () => {
    expect(isStandalone(true)).toBe(true);
    expect(isStandalone(false, true)).toBe(true);
    expect(isStandalone(false, false)).toBe(false);
    expect(isStandalone(false)).toBe(false);
  });
});

describe("shouldShowBanner", () => {
  const base = { standalone: false, dismissed: false, platform: "ios" as const, hasNativePrompt: false };

  it("shows instructions on iPhone when not installed and not dismissed", () => {
    expect(shouldShowBanner(base)).toBe(true);
  });

  it("never shows when already installed", () => {
    expect(shouldShowBanner({ ...base, standalone: true })).toBe(false);
  });

  it("never shows after the user dismissed it", () => {
    expect(shouldShowBanner({ ...base, dismissed: true })).toBe(false);
  });

  it("on Android, shows only when the browser offered its install prompt", () => {
    expect(shouldShowBanner({ ...base, platform: "android", hasNativePrompt: false })).toBe(false);
    expect(shouldShowBanner({ ...base, platform: "android", hasNativePrompt: true })).toBe(true);
  });

  it("on desktop, stays hidden", () => {
    expect(shouldShowBanner({ ...base, platform: "other" })).toBe(false);
  });
});

describe("canInstall", () => {
  it("is for photographers only", () => {
    expect(canInstall("PHOTOGRAPHER")).toBe(true);
    expect(canInstall("SURFER")).toBe(false);
    expect(canInstall("ATHLETE")).toBe(false);
    expect(canInstall(undefined)).toBe(false);
    expect(canInstall(null)).toBe(false);
  });
});

describe("detectInAppBrowser", () => {
  const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  it("names Instagram, Facebook and TikTok browsers", () => {
    expect(detectInAppBrowser(`${IPHONE} Mobile/15E148 Instagram 300.0.0`)).toBe("Instagram");
    expect(detectInAppBrowser(`${IPHONE} Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]`)).toBe("Facebook");
    expect(detectInAppBrowser(`${ANDROID} musical_ly_2023`)).toBe("TikTok");
  });
  it("flags an unnamed iOS WebView", () => {
    expect(detectInAppBrowser(`${IPHONE} (KHTML, like Gecko) Mobile/15E148`)).toBe("this app");
  });
  it("leaves real browsers alone", () => {
    expect(detectInAppBrowser(SAFARI)).toBeNull();
    expect(detectInAppBrowser(`${IPHONE} (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1`)).toBeNull();
    expect(detectInAppBrowser(`${ANDROID} Mobile Safari/537.36`)).toBeNull();
    expect(detectInAppBrowser(MAC)).toBeNull();
  });
});
