import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_REASONS = ["thats_me", "inappropriate", "copyright", "other"];

/** POST /api/photos/report — report a photo for removal */
export async function POST(req: NextRequest) {
  const { photoId, email, reason, details } = await req.json();

  if (!photoId || !email || !reason) {
    return NextResponse.json({ error: "photoId, email, and reason are required" }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const report = await prisma.photoReport.create({
    data: { photoId, email, reason, details: details || null },
  });

  return NextResponse.json({ reported: true, id: report.id });
}
