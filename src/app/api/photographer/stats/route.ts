import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";

/** GET /api/photographer/stats?period=week — photographer dashboard stats */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const period = new URL(req.url).searchParams.get("period") || "all";

  // Calculate date filter
  let dateFilter: Date | undefined;
  const now = new Date();
  if (period === "today") {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const purchaseWhere: any = {
    photo: { session: { photographerId: userId } },
    ...(dateFilter && { createdAt: { gte: dateFilter } }),
  };

  const [sessionCount, photoCount, sales, recentSales] = await Promise.all([
    prisma.session.count({ where: { photographerId: userId } }),
    prisma.photo.count({
      where: { session: { photographerId: userId } },
    }),
    prisma.purchase.aggregate({
      where: purchaseWhere,
      _count: true,
      _sum: { amountInCents: true },
    }),
    prisma.purchase.findMany({
      where: purchaseWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        amountInCents: true,
        createdAt: true,
        photo: {
          select: {
            thumbnailKey: true,
            session: { select: { title: true } },
          },
        },
        user: { select: { name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    sessions: sessionCount,
    photos: photoCount,
    photosSold: sales._count,
    revenue: sales._sum.amountInCents || 0,
    recentSales: recentSales.map((s) => ({
      id: s.id,
      amount: s.amountInCents,
      date: s.createdAt.toISOString(),
      sessionTitle: s.photo.session.title,
      buyerName: s.user.name,
      thumbnailUrl: getPreviewUrl(s.photo.thumbnailKey),
    })),
  });
}
