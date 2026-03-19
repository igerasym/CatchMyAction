import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** POST /api/sessions/:id/notify — subscribe to session notifications */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    await prisma.sessionNotification.upsert({
      where: { email_sessionId: { email, sessionId: params.id } },
      create: { email, sessionId: params.id },
      update: {},
    });

    return NextResponse.json({ subscribed: true });
  } catch (err: any) {
    console.error("Notify error:", err);
    return NextResponse.json({ error: err.message || "Failed to subscribe" }, { status: 500 });
  }
}

/** GET /api/sessions/:id/notify — get subscriber count */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const count = await prisma.sessionNotification.count({
    where: { sessionId: params.id },
  });
  return NextResponse.json({ count });
}
