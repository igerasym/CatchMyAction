import { describe, expect, it } from "vitest";
import { filesToResume, summarise } from "@/lib/upload-resume";

type Item = { id: string; status: "pending" | "done" | "failed"; lastError?: string };

const items: Item[] = [
  { id: "a", status: "done" },
  { id: "b", status: "pending" },
  { id: "c", status: "failed", lastError: "retryable" },
  { id: "d", status: "failed", lastError: "Photo too small (100×80px)" },
  { id: "e", status: "done" },
  { id: "f", status: "pending" },
];

describe("summarise", () => {
  it("counts each state for the 'uploaded N of M' line", () => {
    expect(summarise(items)).toEqual({ total: 6, done: 2, pending: 2, failed: 2 });
  });

  it("handles an empty batch", () => {
    expect(summarise([])).toEqual({ total: 0, done: 0, pending: 0, failed: 0 });
  });
});

describe("filesToResume", () => {
  it("never re-sends a file that already reached the server", () => {
    const ids = filesToResume(items).map((i) => i.id);
    expect(ids).not.toContain("a");
    expect(ids).not.toContain("e");
  });

  it("resumes pending files and network-failed files", () => {
    const ids = filesToResume(items).map((i) => i.id);
    expect(ids).toEqual(["b", "f", "c"]);
  });

  it("does not retry files the server rejected outright", () => {
    const ids = filesToResume(items).map((i) => i.id);
    expect(ids).not.toContain("d");
  });

  it("returns nothing when the batch is finished", () => {
    expect(filesToResume([{ id: "x", status: "done" as const, lastError: undefined }])).toEqual([]);
  });
});
