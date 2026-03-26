import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";

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
  const platformFee = Math.round(totalGross * 0.18);
  const totalNet = totalGross - platformFee;
  const totalSales = purchases.length;

  // Daily revenue for chart (last N days)
  const dailyMap = new Map<string, number>();
  const days = range === "all" ? 90 : parseInt(range);
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dailyMap.set(d.toISOString().split("T")[0], 0);
  }
  purchases.forEach((p) => {
    const day = p.createdAt.toISOString().split("T")[0];
    dailyMap.set(day, (dailyMap.get(day) || 0) + p.amountInCents);
  });
  const dailyRevenue = Array.from(dailyMap.entries())
    .map(([date, gross]) => ({
      date,
      gross,
      net: Math.round(gross * 0.82),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Per-session breakdown — enrich with viewCount
  const sessionMap = new Map<string, {
    id: string; title: string; location: string;
    sales: number; gross: number;
  }>();
  purchases.forEach((p) => {
    const s = p.photo.session;
    const existing = sessionMap.get(s.id) || {
      id: s.id, title: s.title, location: s.location, sales: 0, gross: 0,
    };
    existing.sales++;
    existing.gross += p.amountInCents;
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
    .map((s) => ({ ...s, net: Math.round(s.gross * 0.82), views: viewMap.get(s.id) || 0 }))
    .sort((a, b) => b.gross - a.gross);

  // Recent transactions
  const transactions = purchases.slice(0, 20).map((p) => ({
    id: p.id,
    amount: p.amountInCents,
    net: Math.round(p.amountInCents * 0.82),
    date: p.createdAt.toISOString(),
    buyerName: p.user.name,
    sessionTitle: p.photo.session.title,
    thumbnailUrl: getPreviewUrl(p.photo.thumbnailKey),
  }));

  return NextResponse.json({
    totalGross,
    totalNet,
    platformFee,
    totalSales,
    dailyRevenue,
    perSession,
    transactions,
  });
}
