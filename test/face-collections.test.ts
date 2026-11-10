import { describe, expect, it } from "vitest";
import { collectionsToSearch, currentCollection, isSharedCollection, legacyCollection, targetCollection } from "@/lib/face-collections";

describe("face collections", () => {
  it("sessions at a spot share one collection, others keep their own", () => {
    expect(targetCollection({ id: "s1", spotId: "sp9" })).toBe("spot-sp9");
    expect(targetCollection({ id: "s2", spotId: "sp9" })).toBe("spot-sp9");
    expect(targetCollection({ id: "s3", spotId: null })).toBe("session-s3");
  });

  it("an unmoved session is still in its legacy collection", () => {
    expect(currentCollection({ id: "s1", faceCollection: null })).toBe(legacyCollection("s1"));
    expect(currentCollection({ id: "s1", faceCollection: "spot-sp9" })).toBe("spot-sp9");
  });

  it("searches each shared collection once", () => {
    expect(
      collectionsToSearch([
        { id: "a", faceCollection: "spot-x" },
        { id: "b", faceCollection: "spot-x" },
        { id: "c", faceCollection: null },
        { id: "d", faceCollection: "spot-y" },
      ])
    ).toEqual(["spot-x", "session-c", "spot-y"]);
  });

  it("only spot collections are shared", () => {
    expect(isSharedCollection("spot-x")).toBe(true);
    expect(isSharedCollection("session-x")).toBe(false);
  });

  it("collection ids stay within what Rekognition allows", () => {
    expect(targetCollection({ id: "cmw8kqhr80001pk8s26g8qxdb", spotId: "cmabc123" })).toMatch(/^[a-zA-Z0-9_.-]+$/);
  });
});
