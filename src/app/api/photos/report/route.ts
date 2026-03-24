import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const VALID_REASONS = ["thats_me", "inappropriate", "copyright", "other"];
const REASON_LABELS: Record<string, string> = {
  thats_me: "That's me — I want my photo removed",
  inappropriate: "Inappropriate content",
  copyright: "Copyright violation",
  other: "Other",
};

/** POST /api/photos/report — report a photo for removal */
export async function POST(req: NextRequest) {
  const { photoId, email, reason, details } = await req.json();

  if (!photoId || !email || !reason) {
    return NextResponse.json({ error: "photoId, email, and reason are required" }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      session: {
        select: {
          id: true,
          title: true,
          photographer: { select: { email: true, name: true } },
        },
      },
    },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const report = await prisma.photoReport.create({
    data: { photoId, email, reason, details: details || null },
  });

  // Notify photographer
  const p = photo.session.photographer;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const manageLink = `${APP_URL}/dashboard/sessions/${photo.session.id}`;
  sendEmail({
    to: p.email,
    subject: `Photo removal request — ${photo.session.title}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #333;">Photo Removal Request</h2>
        <p style="color: #666; line-height: 1.6;">Someone has requested removal of a photo from your session <strong>${photo.session.title}</strong>.</p>
        <p style="color: #666;"><strong>Reason:</strong> ${REASON_LABELS[reason] || reason}</p>
        ${details ? '<p style="color: #666;"><strong>Details:</strong> ' + details + '</p>' : ''}
        <p style="color: #666;"><strong>Reporter:</strong> ${email}</p>
        <a href="${manageLink}" style="display: inline-block; margin: 24px 0; padding: 14px 32px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Manage Photos
        </a>
        <p style="color: #999; font-size: 13px; margin-top: 32px;">Please review and remove the photo within 48 hours if the request is valid. — CatchMyAction</p>
      </div>
    `,
  }).catch((err) => console.error("Report notification error:", err));

  return NextResponse.json({ reported: true, id: report.id });
}
