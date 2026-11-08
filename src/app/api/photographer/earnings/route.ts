import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { countSoldPhotos, freeSalesLeft, platformFee } from "@/lib/stripe";

/**
 * Photographer's cut of one purchase; prefers the value stored at payment time (which already
 * reflects commission-free sales). Only rows from before share tracking fall back to the flat fee.
 */
function shareOf(p: { amountInCents: number; photographerShareCents: number | null }): number {
  return p.photographerShareCents ?? p.amountInCents - platformFee(p.amountInCents);
}

/**
 * "pending": the platform holds the money until Stripe is connected.
 * "held": payment was refunded or disputed, so it is not paid out.
 * Rows without a status predate tracking and count as sent.
 */
function payoutOf(p: { payoutStatus: string | null }): "sent" | "pending" | "held" {
  if (p.payoutStatus === "pending") return "pending";
  if (p.payoutStatus === "held") return "held";
  return "sent";
}

/** GET /api/photographer/earnings — detailed earnings data */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "30"; // days

  const sinceDate = range === "all"
    ? new Date(0)
    : new Date(Date.now() - parseInt(range) * 24 * 60 * 60 * 1000);

  // All purchases for this photographer's photos
  const purchases = await prisma.purchase.findMany({
    where: {
      photo: { session: { photographerId: userId } },
      createdAt: { gte: sinceDate },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountInCents: true,
      photographerShareCents: true,
      payoutStatus: true,
      createdAt: true,
      photo: {
        select: {
          id: true,
          thumbnailKey: true,
          session: { select: { id: true, title: true, location: true } },
        },
      },
      user: { select: { name: true } },
    },
  });

  // Totals
  const totalGross = purchases.reduce((sum, p) => sum + p.amountInCents, 0);
  const totalNet = purchases.reduce((sum, p) => sum + shareOf(p), 0);
  const platformFeeTotal = totalGross - totalNet;
  const pendingNet = purchases.filter((p) => payoutOf(p) === "pending").reduce((sum, p) => sum + shareOf(p), 0);
  const heldNet = purchases.filter((p) => payoutOf(p) === "held").reduce((sum, p) => sum + shareOf(p), 0);
  const sentNet = totalNet - pendingNet - heldNet;
  const totalSales = purchases.length;
  // All-time, independent of the selected range.
  const soldAllTime = await countSoldPhotos(userId);

  // Daily revenue for chart (last N days)
  const dailyMap = new Map<string, { gross: number; net: number }>();
  const days = range === "all" ? 90 : parseInt(range);
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(d.toISOString().split("T")[0], { gross: 0, net: 0 });
  }
  purchases.forEach((p) => {
    const day = p.createdAt.toISOString().split("T")[0];
    const cur = dailyMap.get(day) || { gross: 0, net: 0 };
    dailyMap.set(day, { gross: cur.gross + p.amountInCents, net: cur.net + shareOf(p) });
  });
  const dailyRevenue = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, gross: v.gross, net: v.net }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-session breakdown — enrich with viewCount
  const sessionMap = new Map<string, {
    id: string; title: string; location: string;
    sales: number; gross: number; net: number;
  }>();
  purchases.forEach((p) => {
    const s = p.photo.session;
    const existing = sessionMap.get(s.id) || {
      id: s.id, title: s.title, location: s.location, sales: 0, gross: 0, net: 0,
    };
    existing.sales++;
    existing.gross += p.amountInCents;
    existing.net += shareOf(p);
    sessionMap.set(s.id, existing);
  });

  // Fetch viewCounts for sessions with sales
  const sessionIds = Array.from(sessionMap.keys());
  const sessionViews = sessionIds.length > 0
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        select: { id: true, viewCount: true },
      })
    : [];
  const viewMap = new Map(sessionViews.map((s) => [s.id, s.viewCount]));

  const perSession = Array.from(sessionMap.values())
    .map((s) => ({ ...s, views: viewMap.get(s.id) || 0 }))
    .sort((a, b) => b.gross - a.gross);

  // Recent transactions
  const transactions = purchases.slice(0, 20).map((p) => ({
    id: p.id,
    amount: p.amountInCents,
    net: shareOf(p),
    payout: payoutOf(p),
    date: p.createdAt.toISOString(),
    buyerName: p.user.name,
    sessionTitle: p.photo.session.title,
    thumbnailUrl: getPreviewUrl(p.photo.thumbnailKey),
  }));

  return NextResponse.json({
    totalGross,
    totalNet,
    platformFee: platformFeeTotal,
    sentNet,
    pendingNet,
    heldNet,
    totalSales,
    freeSalesLeft: freeSalesLeft(soldAllTime),
    dailyRevenue,
    perSession,
    transactions,
  });
}
