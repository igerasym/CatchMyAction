import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";

/** GET /api/sessions — list sessions with optional filters */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location");
  const date = searchParams.get("date");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

  const where: Record<string, unknown> = { published: true };
  if (location) where.location = { contains: location, mode: "insensitive" };
  if (date) where.date = new Date(date);

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      include: {
        photographer: { select: { id: true, name: true } },
        photos: { take: 1, select: { previewKey: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.session.count({ where }),
  ]);

  return NextResponse.json({
    sessions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

/** POST /api/sessions — create a new session (authenticated only) */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const body = await req.json();
  const { title, location, date, startTime, endTime, description, photographerId, pricePerPhoto } = body;

  if (!title || !location || !date || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Use authenticated user's ID, ignore client-sent photographerId
  try {
    const session = await prisma.session.create({
      data: {
        title,
        location,
        date: new Date(date),
        startTime,
        endTime,
        description,
        photographerId: user.id,
        ...(pricePerPhoto && { pricePerPhoto }),
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (err: any) {
    console.error("Session create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create session" }, { status: 500 });
  }
}
