/**
 * Feedback (bugs, ideas, questions): validation of what the dialog sends, and the texts of the notifications.
 * Pure, so the API route stays thin and every rule here is covered by tests.
 */
import { escapeHtml } from "@/lib/html";
import { validateEmail } from "@/lib/validation";

import { FEEDBACK_LABEL, FEEDBACK_TYPES, MAX_MESSAGE, MIN_MESSAGE, type FeedbackType } from "@/lib/feedback-types";

export { FEEDBACK_LABEL, FEEDBACK_TYPES, MAX_MESSAGE, MIN_MESSAGE, type FeedbackType };

export interface FeedbackInput {
  type: FeedbackType;
  message: string;
  email: string | null;
  path: string | null;
  userAgent: string | null;
  viewport: string | null;
}

export type ParseResult =
  | { ok: true; value: FeedbackInput }
  | { ok: false; code: "spam" | "invalid"; error: string };

/** Control characters (except newline and tab in the message) have no place in anything we store or send. */
const stripControl = (s: string, keepNewlines: boolean) =>
  s.replace(keepNewlines ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "");

/**
 * Page the feedback was sent from. Only the path: query strings and fragments can carry tokens
 * (password reset, email verification), so they are cut before anything is stored.
 */
export function cleanPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = stripControl(value.split(/[?#]/)[0], false).trim().slice(0, 200);
  return path.startsWith("/") && !path.startsWith("//") ? path : null;
}

export function parseFeedback(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, code: "invalid", error: "Invalid request" };
  const b = body as Record<string, unknown>;

  // Hidden field a person never sees; bots fill every input
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return { ok: false, code: "spam", error: "Invalid request" };
  }

  if (typeof b.type !== "string" || !(FEEDBACK_TYPES as readonly string[]).includes(b.type)) {
    return { ok: false, code: "invalid", error: "Choose what you are sending: bug, idea or question" };
  }

  const message = typeof b.message === "string" ? stripControl(b.message, true).trim() : "";
  if (message.length < MIN_MESSAGE) {
    return { ok: false, code: "invalid", error: "Please write a few words so we can understand it" };
  }
  if (message.length > MAX_MESSAGE) {
    return { ok: false, code: "invalid", error: `Please keep it under ${MAX_MESSAGE} characters` };
  }

  let email: string | null = null;
  if (typeof b.email === "string" && b.email.trim() !== "") {
    const e = b.email.trim();
    if (e.length > 254 || !validateEmail(e)) {
      return { ok: false, code: "invalid", error: "That email address does not look right" };
    }
    email = e;
  }

  const viewport = typeof b.viewport === "string" && /^\d{2,5}x\d{2,5}$/.test(b.viewport) ? b.viewport : null;
  const userAgent = typeof b.userAgent === "string" ? stripControl(b.userAgent, false).trim().slice(0, 300) || null : null;

  return {
    ok: true,
    value: { type: b.type as FeedbackType, message, email, path: cleanPath(b.path), userAgent, viewport },
  };
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}\u2026` : s);

export interface StoredFeedback extends FeedbackInput {
  id: string;
  role: string | null;
}

/** Telegram message. Deliberately without the sender's email or browser details: those stay in the database and the email. */
export function telegramText(f: StoredFeedback): string {
  const who = f.role ? f.role.toLowerCase() : "visitor";
  return [
    `${FEEDBACK_LABEL[f.type]} \u00B7 ${f.path ?? "unknown page"}`,
    "",
    clip(f.message, 600),
    "",
    `from: ${who} \u00B7 id ${f.id}`,
  ].join("\n");
}

export function emailSubject(f: Pick<FeedbackInput, "type" | "message">): string {
  return `[Feedback: ${f.type}] ${clip(oneLine(f.message), 70)}`;
}

export function emailText(f: StoredFeedback): string {
  return [
    f.message,
    "",
    "---",
    `Type: ${FEEDBACK_LABEL[f.type]}`,
    `Reply to: ${f.email ?? "(none given)"}`,
    `Page: ${f.path ?? "-"}`,
    `Role: ${f.role ?? "anonymous"}`,
    `Screen: ${f.viewport ?? "-"}`,
    `Browser: ${f.userAgent ?? "-"}`,
    `Id: ${f.id}`,
  ].join("\n");
}

export function emailHtml(f: StoredFeedback): string {
  const row = (k: string, v: string | null) =>
    `<tr><td style="padding:2px 12px 2px 0;color:#888">${k}</td><td>${escapeHtml(v ?? "-")}</td></tr>`;
  return `
    <div style="font-family:-apple-system,sans-serif;max-width:560px">
      <p style="white-space:pre-wrap;line-height:1.5;font-size:15px">${escapeHtml(f.message)}</p>
      <table style="font-size:13px;margin-top:16px;border-top:1px solid #ddd;padding-top:8px">
        ${row("Type", FEEDBACK_LABEL[f.type])}
        ${row("Reply to", f.email ?? "(none given)")}
        ${row("Page", f.path)}
        ${row("Role", f.role ?? "anonymous")}
        ${row("Screen", f.viewport)}
        ${row("Browser", f.userAgent)}
        ${row("Id", f.id)}
      </table>
    </div>`;
}
