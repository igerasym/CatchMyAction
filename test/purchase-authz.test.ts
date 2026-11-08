/**
 * AuthZ matrix for the money routes: anonymous / buyer / other user.
 * Prisma, auth, S3 and Stripe are mocked — these tests pin WHO may do WHAT, not the DB layer.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const auth = vi.hoisted(() => ({ user: null as null | { id: string } }));
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  photo: { findUnique: vi.fn() },
  purchase: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getAuthUser: async () =>
    auth.user ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
}));
vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/s3", () => ({
  BUCKET_ORIGINALS: "originals",
  getPreviewUrl: (k: string) => `/p/${k}`,
  getDownloadUrl: vi.fn(async (_b: string, key: string) => `https://signed.example/${key}`),
}));
vi.mock("@/lib/stripe", () => ({
  paymentsMode: () => "mock",
  getConnectDestination: vi.fn(),
  createPhotoCheckout: vi.fn(),
}));

import { POST as purchase } from "@/app/api/photos/[id]/purchase/route";
import { GET as download } from "@/app/api/photos/[id]/download/route";

const req = (url = "http://localhost/api/photos/p1") => new NextRequest(url, { method: "POST" });
const params = { params: { id: "p1" } };

const publishedPhoto = {
  id: "p1",
  priceInCents: 500,
  originalKey: "orig/p1.jpg",
  previewKey: "prev/p1.jpg",
  thumbnailKey: null,
  session: { id: "s1", title: "Cokes dawn", photographerId: "photog", published: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = null;
  db.user.findUnique.mockResolvedValue({ emailVerified: new Date() });
  db.photo.findUnique.mockResolvedValue(publishedPhoto);
  db.purchase.findUnique.mockResolvedValue(null);
  db.purchase.create.mockResolvedValue({ id: "pur1" });
});

describe("POST /api/photos/:id/purchase", () => {
  it("rejects anonymous callers", async () => {
    const res = await purchase(req(), params);
    expect(res.status).toBe(401);
    expect(db.purchase.create).not.toHaveBeenCalled();
  });

  it("records the purchase for the signed-in user, never a user id from the request", async () => {
    auth.user = { id: "buyer" };
    const body = new NextRequest("http://localhost/api/photos/p1?userId=victim", {
      method: "POST",
      body: JSON.stringify({ userId: "victim" }),
    });
    const res = await purchase(body, params);
    expect(res.status).toBe(200);
    expect(db.purchase.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "buyer", amountInCents: 500 }) })
    );
  });

  it("lets a buyer with an unconfirmed email pay (confirming comes after the purchase)", async () => {
    auth.user = { id: "buyer" };
    db.user.findUnique.mockResolvedValue({ id: "buyer", emailVerified: null });
    const res = await purchase(req(), params);
    expect(res.status).toBe(200);
    expect(db.purchase.create).toHaveBeenCalledTimes(1);
  });

  it("still refuses a signed-in id whose account no longer exists", async () => {
    auth.user = { id: "ghost" };
    db.user.findUnique.mockResolvedValue(null);
    const res = await purchase(req(), params);
    expect(res.status).toBe(401);
    expect(db.purchase.create).not.toHaveBeenCalled();
  });

  it("hides photos of unpublished sessions from non-owners", async () => {
    auth.user = { id: "buyer" };
    db.photo.findUnique.mockResolvedValue({
      ...publishedPhoto,
      session: { ...publishedPhoto.session, published: false },
    });
    const res = await purchase(req(), params);
    expect(res.status).toBe(404);
  });

  it("does not charge twice", async () => {
    auth.user = { id: "buyer" };
    db.purchase.findUnique.mockResolvedValue({ id: "pur0" });
    const res = await purchase(req(), params);
    expect(await res.json()).toMatchObject({ alreadyPurchased: true });
    expect(db.purchase.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/photos/:id/download", () => {
  it("rejects anonymous callers", async () => {
    const res = await download(req(), params);
    expect(res.status).toBe(401);
  });

  it("refuses users who did not buy the photo", async () => {
    auth.user = { id: "someone-else" };
    const res = await download(req(), params);
    expect(res.status).toBe(403);
    expect(db.purchase.findUnique).toHaveBeenCalledWith({
      where: { userId_photoId: { userId: "someone-else", photoId: "p1" } },
    });
  });

  it("returns a signed original URL to the buyer", async () => {
    auth.user = { id: "buyer" };
    db.purchase.findUnique.mockResolvedValue({ id: "pur1" });
    const res = await download(req(), params);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ downloadUrl: "https://signed.example/orig/p1.jpg" });
  });
});
