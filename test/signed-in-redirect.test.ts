import { describe, it, expect } from "vitest";
import { signedInDestination } from "@/lib/signed-in-redirect";

describe("signedInDestination", () => {
  it("sends photographers to the dashboard", () => {
    expect(signedInDestination("PHOTOGRAPHER", "/", false)).toBe("/dashboard");
    expect(signedInDestination("PHOTOGRAPHER", "/", true)).toBe("/dashboard");
  });
  it("honours a callback for photographers", () => {
    expect(signedInDestination("PHOTOGRAPHER", "/sessions/x", false)).toBe("/sessions/x");
  });
  it("sends athletes who want a photographer account to settings", () => {
    expect(signedInDestination("USER", "/", true)).toBe("/settings");
  });
  it("sends athletes back to the callback", () => {
    expect(signedInDestination("USER", "/sessions/x", false)).toBe("/sessions/x");
  });
});
