import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/sessions/:id — get session with all photos */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      photographer: { select: { id: true, name: true, avatarUrl: true } },
      photos: {
        select: {
          id: true,
          previewKey: true,
          thumbnailKey: true,
          width: true,
          height: true,
          priceInCents: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

/** PATCH /api/sessions/:id — update session (publish, edit details) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { title, location, date, startTime, endTime, description, published, coverPhotoId, pricePerPhoto } = body;

  const session = await prisma.session.update({
    where: { id: params.id },
    data: {
      ...(title && { title }),
      ...(location && { location }),
      ...(date && { date: new Date(date) }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
      ...(description !== undefined && { description }),
      ...(published !== undefined && { published }),
      ...(coverPhotoId !== undefined && { coverPhotoId }),
      ...(pricePerPhoto !== undefined && { pricePerPhoto }),
    },
  });

  // If price changed, update all existing photos in this session
  if (pricePerPhoto !== undefined) {
    await prisma.photo.updateMany({
      where: { sessionId: params.id },
      data: { priceInCents: pricePerPhoto },
    });
  }

  return NextResponse.json(session);
}

/** DELETE /api/sessions/:id — delete session and all its photos */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Photos cascade-delete via schema, purchases need manual cleanup
  await prisma.purchase.deleteMany({
    where: { photo: { sessionId: params.id } },
  });

  await prisma.session.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true });
}
