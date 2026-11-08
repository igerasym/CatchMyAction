import { describe, expect, it } from "vitest";
import { sessionThumbKey, type CoverPhoto } from "@/lib/session-cover";

const covers = new Map<string, CoverPhoto>([
  ["c1", { id: "c1", sessionId: "s1", thumbnailKey: "thumb/c1.jpg", previewKey: "prev/c1.jpg" }],
  ["c2", { id: "c2", sessionId: "other", thumbnailKey: "thumb/c2.jpg" }],
]);
const first = { thumbnailKey: "thumb/first.jpg", previewKey: "prev/first.jpg" };

describe("sessionThumbKey", () => {
  it("uses the photographer's cover", () => {
    expect(sessionThumbKey({ id: "s1", coverPhotoId: "c1" }, covers, first)).toBe("thumb/c1.jpg");
  });

  it("falls back to the first photo without a cover", () => {
    expect(sessionThumbKey({ id: "s1", coverPhotoId: null }, covers, first)).toBe("thumb/first.jpg");
  });

  it("ignores a cover id from another session or a deleted photo", () => {
    expect(sessionThumbKey({ id: "s1", coverPhotoId: "c2" }, covers, first)).toBe("thumb/first.jpg");
    expect(sessionThumbKey({ id: "s1", coverPhotoId: "gone" }, covers, first)).toBe("thumb/first.jpg");
  });

  it("uses the preview key when a thumbnail key is empty, and null without photos", () => {
    expect(sessionThumbKey({ id: "s1", coverPhotoId: null }, covers, { thumbnailKey: "", previewKey: "p.jpg" })).toBe("p.jpg");
    expect(sessionThumbKey({ id: "s1", coverPhotoId: null }, covers, undefined)).toBeNull();
  });
});
