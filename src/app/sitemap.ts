import { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const BASE_URL = "https://catchmyactions.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/sessions`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/upload`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.2 },
  ];

  // Dynamic session pages
  const sessions = await prisma.session.findMany({
    where: { published: true },
    select: { id: true, updatedAt: true },
    orderBy: { date: "desc" },
    take: 500,
  });

  const sessionPages: MetadataRoute.Sitemap = sessions.map((s) => ({
    url: `${BASE_URL}/sessions/${s.id}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Photographer profile pages
  const photographers = await prisma.user.findMany({
    where: { role: "PHOTOGRAPHER" },
    select: { id: true, updatedAt: true },
    take: 200,
  });

  const photographerPages: MetadataRoute.Sitemap = photographers.map((p) => ({
    url: `${BASE_URL}/photographer/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...sessionPages, ...photographerPages];
}
