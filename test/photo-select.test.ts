import { describe, expect, it } from "vitest";
import { formatPrice, selectHint, selectLabel } from "@/lib/photo-select";

describe("photo select copy", () => {
  it("formats prices", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(999)).toBe("$9.99");
  });

  it("hint reads as download for free-only, buy for paid-only, both when mixed", () => {
    expect(selectHint([])).toBeNull();
    expect(selectHint([0, 0])).toMatch(/download them/);
    expect(selectHint([0, 0])).not.toMatch(/buy/);
    expect(selectHint([999, 500])).toMatch(/buy them/);
    expect(selectHint([0, 999])).toMatch(/buy or download/);
  });

  it("labels free photos as download and paid ones as buy", () => {
    expect(selectLabel(3, 0)).toBe("Select photo 3 to download (free)");
    expect(selectLabel(1, 1250)).toBe("Select photo 1 to buy ($12.50)");
  });
});
