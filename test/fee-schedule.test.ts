import { describe, expect, it } from "vitest";
import { feeBpsPerItem, platformFee, LAUNCH_FEE_BPS, PLATFORM_FEE_BPS } from "@/lib/stripe";

describe("launch fee schedule", () => {
  it("gives the reduced rate to a photographer's first 10 sales", () => {
    expect(feeBpsPerItem(0, 1)).toEqual([LAUNCH_FEE_BPS]);
    expect(feeBpsPerItem(9, 1)).toEqual([LAUNCH_FEE_BPS]);
  });

  it("switches to the standard rate from the 11th sale", () => {
    expect(feeBpsPerItem(10, 1)).toEqual([PLATFORM_FEE_BPS]);
    expect(feeBpsPerItem(25, 1)).toEqual([PLATFORM_FEE_BPS]);
  });

  it("splits a bulk cart across the boundary item by item", () => {
    expect(feeBpsPerItem(9, 3)).toEqual([LAUNCH_FEE_BPS, PLATFORM_FEE_BPS, PLATFORM_FEE_BPS]);
    expect(feeBpsPerItem(0, 3)).toEqual([LAUNCH_FEE_BPS, LAUNCH_FEE_BPS, LAUNCH_FEE_BPS]);
  });

  it("computes fees at the rate passed in", () => {
    expect(platformFee(1000, LAUNCH_FEE_BPS)).toBe(100);
    expect(platformFee(1000)).toBe(180);
  });
});
