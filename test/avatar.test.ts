import { describe, it, expect } from "vitest";
import { avatarKey, avatarKeyFromUrl } from "@/lib/avatar";

describe("avatar keys", () => {
  it("is unique per upload", () => {
    expect(avatarKey("u1", 1)).toBe("avatars/u1-1.jpg");
    expect(avatarKey("u1", 1)).not.toBe(avatarKey("u1", 2));
  });
  it("extracts the key from CDN, legacy (?v=) and local URLs", () => {
    expect(avatarKeyFromUrl("https://d3.cloudfront.net/avatars/u1.jpg?v=123", "u1")).toBe("avatars/u1.jpg");
    expect(avatarKeyFromUrl("https://d3.cloudfront.net/avatars/u1-99.jpg", "u1")).toBe("avatars/u1-99.jpg");
    expect(avatarKeyFromUrl("/api/uploads/previews/avatars/u1-5.jpg", "u1")).toBe("avatars/u1-5.jpg");
  });
  it("refuses anything that is not the user's own avatar", () => {
    expect(avatarKeyFromUrl(null, "u1")).toBeNull();
    expect(avatarKeyFromUrl("https://lh3.googleusercontent.com/a/xyz", "u1")).toBeNull();
    expect(avatarKeyFromUrl("https://cdn/avatars/u2.jpg", "u1")).toBeNull();
    expect(avatarKeyFromUrl("https://cdn/avatars/u1-a/x.jpg", "u1")).toBeNull();
  });
});
