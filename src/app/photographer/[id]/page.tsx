import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PhotographerProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const photographer = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      website: true,
      instagram: true,
      youtube: true,
      tiktok: true,
      createdAt: true,
      sessions: {
        where: { published: true },
        include: {
          photos: { take: 4, select: { thumbnailKey: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!photographer) notFound();

  const totalPhotos = photographer.sessions.reduce(
    (sum, s) => sum + s.photoCount,
    0
  );
  const totalSessions = photographer.sessions.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-10">
        <div className="w-20 h-20 rounded-full bg-ocean-500/20 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden">
          {photographer.avatarUrl ? (
            <img src={photographer.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-ocean-400 font-bold text-2xl">{photographer.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{photographer.name}</h1>
          <p className="text-white/40 text-sm">
            Joined {format(new Date(photographer.createdAt), "MMMM yyyy")}
          </p>
          {photographer.bio && (
            <p className="text-white/50 text-sm mt-2 leading-relaxed">{photographer.bio}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-sm text-white/50">
              <span className="text-white font-semibold">{totalSessions}</span> sessions
            </span>
            <span className="text-sm text-white/50">
              <span className="text-white font-semibold">{totalPhotos}</span> photos
            </span>
          </div>
          {/* Social links */}
          <div className="flex flex-wrap gap-3 mt-3">
            {photographer.website && (
              <a href={photographer.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-ocean-400 hover:underline">🌐 Website</a>
            )}
            {photographer.instagram && (
              <a href={`https://instagram.com/${photographer.instagram}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-ocean-400 hover:underline">📷 @{photographer.instagram}</a>
            )}
            {photographer.youtube && (
              <a href={`https://youtube.com/@${photographer.youtube}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-ocean-400 hover:underline">▶️ @{photographer.youtube}</a>
            )}
            {photographer.tiktok && (
              <a href={`https://tiktok.com/@${photographer.tiktok}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-ocean-400 hover:underline">🎵 @{photographer.tiktok}</a>
            )}
          </div>
        </div>
      </div>

      {/* Sessions grid */}
      {photographer.sessions.length === 0 ? (
        <p className="text-center text-white/30 py-12">
          No published sessions yet
        </p>
      ) : (
        <div className="space-y-8">
          {photographer.sessions.map((s) => (
            <div key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="group block"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white group-hover:text-ocean-400 transition-colors">
                      {s.title}
                    </h2>
                    <p className="text-sm text-white/40">
                      📍 {s.location} · 📅{" "}
                      {format(new Date(s.date), "MMM d, yyyy")} ·{" "}
                      {s.startTime}–{s.endTime} · 📸 {s.photoCount} photos
                    </p>
                  </div>
                  <span className="text-white/20 group-hover:text-ocean-400 transition-colors text-sm">
                    View →
                  </span>
                </div>
                {/* Photo strip */}
                {s.photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {s.photos.map((p, i) => (
                      <div
                        key={i}
                        className="aspect-[4/3] rounded-lg overflow-hidden bg-white/5"
                      >
                        <img
                          src={getPreviewUrl(p.thumbnailKey)}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
