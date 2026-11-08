import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getViewerId } from "@/lib/auth-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parseFeedback } from "@/lib/feedback";
import { notifyFeedback } from "@/lib/feedback-notify";

const HOUR = 60 * 60 * 1000;

/**
 * POST /api/feedback — a bug report, idea or question from the Feedback dialog. Open to visitors.
 * Stored first, then the owner is told by email and (when configured) Telegram.
 */
export async function POST(req: NextRequest) {
  const viewerId = await getViewerId();

  if (!rateLimit(`feedback:ip:${clientIp(req)}`, 8, HOUR) || (viewerId && !rateLimit(`feedback:u:${viewerId}`, 15, HOUR))) {
    return NextResponse.json({ error: "Too many messages. Please try again in a little while." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseFeedback(body);
  if (!parsed.ok) {
    // A bot gets the same answer as a person and nothing is stored
    if (parsed.code === "spam") return NextResponse.json({ ok: true }, { status: 201 });
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    // Signed in: reply address and role come from the account, not from the form
    const user = viewerId
      ? await prisma.user.findUnique({ where: { id: viewerId }, select: { email: true, role: true } })
      : null;
    const f = parsed.value;
    const row = await prisma.feedback.create({
      data: {
        type: f.type,
        message: f.message,
        email: f.email ?? user?.email ?? null,
        userId: viewerId,
        role: user?.role ?? null,
        path: f.path,
        userAgent: f.userAgent,
        viewport: f.viewport,
      },
      select: { id: true, email: true, role: true },
    });

    // The sender is done once it is stored; a failing channel must not turn into an error for them
    await notifyFeedback({ ...f, id: row.id, email: row.email, role: row.role });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error("Feedback error:", err?.message);
    return NextResponse.json({ error: "Could not send that. Please try again." }, { status: 500 });
  }
}
