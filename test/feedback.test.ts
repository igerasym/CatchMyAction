/**
 * Feedback: what the dialog may send, what is stored, and who is told. Prisma, email and Telegram are mocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ viewer: null as string | null }));
const db = vi.hoisted(() => ({
  feedback: { create: vi.fn() },
  user: { findUnique: vi.fn() },
}));
const mail = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: db }));
vi.mock("@/lib/auth-helpers", () => ({ getViewerId: async () => auth.viewer }));
vi.mock("@/lib/email", () => ({ sendEmail: mail.send }));

import { POST } from "@/app/api/feedback/route";
import { cleanPath, emailHtml, emailSubject, parseFeedback, telegramText } from "@/lib/feedback";

const good = { type: "bug", message: "The map does not load on my phone", website: "" };

describe("parseFeedback", () => {
  it("accepts a bug, an idea and a question", () => {
    for (const type of ["bug", "idea", "question"]) {
      expect(parseFeedback({ ...good, type }).ok).toBe(true);
    }
  });

  it("rejects an unknown type, a missing or too short or too long message", () => {
    expect(parseFeedback({ ...good, type: "complaint" }).ok).toBe(false);
    expect(parseFeedback({ ...good, message: "hi" }).ok).toBe(false);
    expect(parseFeedback({ ...good, message: "     " }).ok).toBe(false);
    expect(parseFeedback({ ...good, message: "x".repeat(2001) }).ok).toBe(false);
    expect(parseFeedback({ ...good, message: "x".repeat(2000) }).ok).toBe(true);
    expect(parseFeedback(null).ok).toBe(false);
    expect(parseFeedback("text").ok).toBe(false);
  });

  it("treats a filled honeypot as spam", () => {
    const r = parseFeedback({ ...good, website: "http://spam.example" });
    expect(r).toMatchObject({ ok: false, code: "spam" });
  });

  it("validates the email only when one is given", () => {
    expect(parseFeedback({ ...good, email: "" }).ok).toBe(true);
    expect(parseFeedback({ ...good, email: "me@example.com" })).toMatchObject({ ok: true, value: { email: "me@example.com" } });
    expect(parseFeedback({ ...good, email: "not-an-email" }).ok).toBe(false);
    expect(parseFeedback({ ...good, email: `${"a".repeat(250)}@x.io` }).ok).toBe(false);
  });

  it("keeps newlines in the message but drops control characters", () => {
    const r = parseFeedback({ ...good, message: "line one\nline two\u0007\u0000 end" });
    expect(r.ok && r.value.message).toBe("line one\nline two end");
  });

  it("keeps only a plausible viewport and a bounded browser string", () => {
    const r = parseFeedback({ ...good, viewport: "390x844", userAgent: "UA\u0000".repeat(200) });
    expect(r.ok && r.value.viewport).toBe("390x844");
    expect(r.ok && r.value.userAgent!.length).toBeLessThanOrEqual(300);
    const bad = parseFeedback({ ...good, viewport: "<script>" });
    expect(bad.ok && bad.value.viewport).toBeNull();
  });
});

describe("cleanPath", () => {
  it("cuts the query string and the fragment, because tokens live there", () => {
    expect(cleanPath("/reset-password?token=SECRET123")).toBe("/reset-password");
    expect(cleanPath("/api/auth/verify?token=abc#x")).toBe("/api/auth/verify");
    expect(cleanPath("/sessions/abc")).toBe("/sessions/abc");
  });

  it("refuses anything that is not a site path", () => {
    expect(cleanPath("https://evil.example/x")).toBeNull();
    expect(cleanPath("//evil.example/x")).toBeNull();
    expect(cleanPath(42)).toBeNull();
    expect(cleanPath("/a".repeat(300))!.length).toBeLessThanOrEqual(200);
  });
});

describe("notification texts", () => {
  const f = {
    id: "fb1",
    type: "bug" as const,
    message: "Cannot log in\n<img src=x onerror=alert(1)>",
    email: "private@example.com",
    role: "PHOTOGRAPHER",
    path: "/login",
    userAgent: "Mozilla/5.0 (iPhone)",
    viewport: "390x844",
  };

  it("Telegram never carries the email address or the browser string", () => {
    const t = telegramText(f);
    expect(t).toContain("Bug");
    expect(t).toContain("/login");
    expect(t).toContain("photographer");
    expect(t).not.toContain("private@example.com");
    expect(t).not.toContain("Mozilla");
  });

  it("Telegram clips a long message", () => {
    expect(telegramText({ ...f, message: "y".repeat(5000) }).length).toBeLessThan(700);
  });

  it("the email escapes the visitor's HTML", () => {
    const html = emailHtml(f);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("the subject is one line and bounded", () => {
    const s = emailSubject({ type: "idea", message: `first line\nsecond ${"z".repeat(300)}` });
    expect(s).not.toContain("\n");
    expect(s.length).toBeLessThan(100);
    expect(s.startsWith("[Feedback: idea]")).toBe(true);
  });
});

const post = (body: unknown, ip = "1.2.3.4") =>
  POST(
    new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

describe("POST /api/feedback", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    auth.viewer = null;
    db.feedback.create.mockImplementation(async ({ data }: any) => ({ id: "fb1", email: data.email, role: data.role }));
    db.user.findUnique.mockResolvedValue({ email: "account@example.com", role: "USER" });
    mail.send.mockResolvedValue(true);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    delete process.env.FEEDBACK_TO;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("stores a visitor's bug with its page and emails the owner, no Telegram without a token", async () => {
    const res = await post({ ...good, email: "v@example.com", path: "/sessions/x?token=SECRET", viewport: "390x844" }, "10.0.0.1");
    expect(res.status).toBe(201);
    expect(db.feedback.create.mock.calls[0][0].data).toMatchObject({
      type: "bug",
      email: "v@example.com",
      userId: null,
      role: null,
      path: "/sessions/x",
      viewport: "390x844",
    });
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][0]).toMatchObject({ to: "hello@catchmyactions.com", replyTo: "v@example.com" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the account's email and role for a signed-in sender", async () => {
    auth.viewer = "u1";
    await post(good, "10.0.0.2");
    expect(db.feedback.create.mock.calls[0][0].data).toMatchObject({ userId: "u1", email: "account@example.com", role: "USER" });
    expect(mail.send.mock.calls[0][0].replyTo).toBe("account@example.com");
  });

  it("sends the owner mail to FEEDBACK_TO when it is set", async () => {
    process.env.FEEDBACK_TO = "owner@example.com";
    await post(good, "10.0.0.3");
    expect(mail.send.mock.calls[0][0].to).toBe("owner@example.com");
  });

  it("pushes to Telegram when configured, without the email, and never puts the token in a log", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:SECRET-TOKEN";
    process.env.TELEGRAM_CHAT_ID = "42";
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("fetch failed https://api.telegram.org/bot123:SECRET-TOKEN/sendMessage"), { name: "TypeError" }));
    const res = await post({ ...good, email: "v@example.com" }, "10.0.0.4");
    expect(res.status).toBe(201); // a broken channel does not fail the sender
    expect(fetchMock.mock.calls[0][0]).toContain("/bot123:SECRET-TOKEN/sendMessage");
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.chat_id).toBe("42");
    expect(sent.text).not.toContain("v@example.com");
    expect(sent).not.toHaveProperty("parse_mode");
    expect(JSON.stringify(err.mock.calls)).not.toContain("SECRET-TOKEN");
    err.mockRestore();
  });

  it("still succeeds when the email channel fails", async () => {
    mail.send.mockRejectedValueOnce(new Error("resend down"));
    const res = await post(good, "10.0.0.5");
    expect(res.status).toBe(201);
    expect(db.feedback.create).toHaveBeenCalledTimes(1);
  });

  it("answers a bot like a person but stores and sends nothing", async () => {
    const res = await post({ ...good, website: "http://spam.example" }, "10.0.0.6");
    expect(res.status).toBe(201);
    expect(db.feedback.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it("rejects bad input with a message the dialog can show", async () => {
    const res = await post({ ...good, message: "hi" }, "10.0.0.7");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/few words/);
    expect((await post("not json", "10.0.0.8")).status).toBe(400);
    expect(db.feedback.create).not.toHaveBeenCalled();
  });

  it("limits one address to 8 messages an hour", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) statuses.push((await post(good, "10.9.9.9")).status);
    expect(statuses.slice(0, 8).every((s) => s === 201)).toBe(true);
    expect(statuses.slice(8)).toEqual([429, 429]);
  });

  it("reports a storage failure as an error and tells nobody", async () => {
    db.feedback.create.mockRejectedValueOnce(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(good, "10.0.0.10");
    expect(res.status).toBe(500);
    expect(mail.send).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
