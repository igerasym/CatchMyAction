import { describe, expect, it, vi } from "vitest";
import { uploadPhoto } from "@/lib/upload-client";

const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
const res = (status: number, body: unknown = {}) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;
const run = (fetchImpl: any) => uploadPhoto(file, "s1", { fetchImpl, sleep: async () => {} });

describe("uploadPhoto", () => {
  it("succeeds on the first try", async () => {
    const f = vi.fn().mockResolvedValue(res(201, { id: "p1" }));
    expect(await run(f)).toEqual({ ok: true, data: { id: "p1" } });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries network errors and 5xx, then succeeds", async () => {
    const f = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(res(503))
      .mockResolvedValueOnce(res(201, { id: "p1" }));
    expect((await run(f)).ok).toBe(true);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("does not retry a photo the server rejected", async () => {
    const f = vi.fn().mockResolvedValue(res(400, { error: "Photo too small" }));
    expect(await run(f)).toEqual({ ok: false, message: "Photo too small", retryable: false });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("treats a duplicate on a retry as success (the first attempt landed)", async () => {
    const f = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(res(409, { error: "Duplicate" }));
    expect((await run(f)).ok).toBe(true);
  });

  it("keeps a first-attempt duplicate as a real rejection", async () => {
    const f = vi.fn().mockResolvedValue(res(409, { error: "Duplicate photo" }));
    expect(await run(f)).toMatchObject({ ok: false, retryable: false });
  });

  it("gives up after the retries and marks it retryable", async () => {
    const f = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await run(f)).toEqual({ ok: false, message: "Connection lost", retryable: true });
    expect(f).toHaveBeenCalledTimes(4);
  });
});
