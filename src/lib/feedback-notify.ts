import { sendEmail } from "@/lib/email";
import { emailHtml, emailSubject, emailText, telegramText, type StoredFeedback } from "@/lib/feedback";

const DEFAULT_TO = "hello@catchmyactions.com";

/** Telegram push. Skipped when TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set. Never logs the token. */
export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // No parse_mode: the text is a visitor's, so nothing in it may be read as markup
      body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("Feedback: Telegram answered", res.status);
    return res.ok;
  } catch (err: any) {
    // The error message of a failed fetch can contain the URL, which contains the token: log the kind only
    console.error("Feedback: Telegram request failed:", err?.name ?? "error");
    return false;
  }
}

/** Tell the owner. Each channel fails on its own: the feedback is already stored by the time this runs. */
export async function notifyFeedback(f: StoredFeedback): Promise<{ email: boolean; telegram: boolean }> {
  const [email, telegram] = await Promise.allSettled([
    sendEmail({
      to: process.env.FEEDBACK_TO || DEFAULT_TO,
      subject: emailSubject(f),
      html: emailHtml(f),
      text: emailText(f),
      replyTo: f.email ?? undefined,
    }),
    sendTelegram(telegramText(f)),
  ]);
  return {
    email: email.status === "fulfilled" && email.value,
    telegram: telegram.status === "fulfilled" && telegram.value,
  };
}
