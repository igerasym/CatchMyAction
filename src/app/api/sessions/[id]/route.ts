import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, verifySessionOwner } from "@/lib/auth-helpers";
import { deleteFaceCollection } from "@/lib/rekognition";

/** GET /api/sessions/:id — get session (public) */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      photographer: { select: { id: true, name: true, avatarUrl: true } },
      photos: {
        select: { id: true, previewKey: true, thumbnailKey: true, width: true, height: true, priceInCents: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json(session);
}

/** PATCH /api/sessions/:id — update session (owner only) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  if (!(await verifySessionOwner(params.id, user.id))) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  const body = await req.json();
  const { title, location, date, startTime, endTime, description, published, coverPhotoId, pricePerPhoto } = body;

  // Block publishing if email not verified
  if (published === true) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } }) as any;
    if (!dbUser?.emailVerified) {
      return NextResponse.json({
        error: "Verify your email to publish sessions. Go to Settings → Profile to resend verification.",
        needsVerification: true,
      }, { status: 403 });
    }
  }

  try {
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

    if (pricePerPhoto !== undefined) {
      await prisma.photo.updateMany({
        where: { sessionId: params.id },
        data: { priceInCents: pricePerPhoto },
      });
    }

    return NextResponse.json(session);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/sessions/:id — delete session (owner only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  if (!(await verifySessionOwner(params.id, user.id))) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  // Clean up related data
  await prisma.purchase.deleteMany({ where: { photo: { sessionId: params.id } } });
  deleteFaceCollection(params.id).catch(() => {}); // Clean up Rekognition collection
  await prisma.session.delete({ where: { id: params.id } });

  return NextResponse.json({ deleted: true });
}
