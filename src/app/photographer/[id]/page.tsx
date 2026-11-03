import { prisma } from "@/lib/db";
import { getPreviewUrl } from "@/lib/s3";
import { format } from "date-fns";
import { notFound } from "next/navigation";
import Link from "next/link";
import { IconPin, IconCalendar, IconCamera } from "@/app/components/icons";
import { Globe, Instagram, Youtube, Music, ArrowRight } from "lucide-react";
import { sanitizeHttpUrl } from "@/lib/validation";

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
      role: true,
      sessions: {
        where: { published: true },
        include: {
          photos: { take: 4, select: { thumbnailKey: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!photographer || photographer.role !== "PHOTOGRAPHER") notFound();
  const websiteUrl = sanitizeHttpUrl(photographer.website);

  const totalPhotos = photographer.sessions.reduce(
    (sum, s) => sum + s.photoCount,
    0
  );
  const totalSessions = photographer.sessions.length;

  const social = "inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] uppercase text-mute border border-line px-2.5 py-1.5 hover:text-rec hover:border-rec transition-colors";
  const meta = "inline w-3.5 h-3.5 text-dim mr-1 align-[-2px]";

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-14 min-h-screen">
      {/* Profile header */}
      <header className="flex flex-col sm:flex-row items-start gap-6 mb-12">
        <div className="w-24 h-24 rounded-full bg-char-3 border border-line flex items-center justify-center flex-shrink-0 overflow-hidden">
          {photographer.avatarUrl ? (
            <img src={photographer.avatarUrl} alt={`${photographer.name} avatar`} className="w-full h-full object-cover" />
          ) : (
            <span className="disp text-bone text-3xl" aria-hidden="true">{photographer.name.charAt(0)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="hud mb-4">Photographer / Profile</p>
          <h1 className="disp text-[clamp(34px,5vw,56px)] text-bone">
            {photographer.name}<span className="text-rec">.</span>
          </h1>
          <p className="font-mono text-[11px] tracking-[0.12em] uppercase text-dim mt-3">
            Joined {format(new Date(photographer.createdAt), "MMMM yyyy")}
          </p>
          {photographer.bio && (
            <p className="text-mute text-[15px] mt-4 leading-relaxed max-w-2xl">{photographer.bio}</p>
          )}
          <dl className="flex flex-wrap gap-8 mt-6 pt-5 border-t border-line">
            <div>
              <dt className="hud">Sessions</dt>
              <dd className="disp text-3xl text-bone mt-1">{totalSessions}</dd>
            </div>
            <div>
              <dt className="hud">Photos</dt>
              <dd className="disp text-3xl text-bone mt-1">{totalPhotos}</dd>
            </div>
          </dl>
          {/* Social links */}
          <div className="flex flex-wrap gap-2 mt-6">
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className={social}>
                <Globe className="w-3.5 h-3.5" aria-hidden="true" /> Website
              </a>
            )}
            {photographer.instagram && (
              <a href={`https://instagram.com/${photographer.instagram}`} target="_blank" rel="noopener noreferrer" className={social}
                aria-label={`Instagram @${photographer.instagram}`}>
                <Instagram className="w-3.5 h-3.5" aria-hidden="true" /> @{photographer.instagram}
              </a>
            )}
            {photographer.youtube && (
              <a href={`https://youtube.com/@${photographer.youtube}`} target="_blank" rel="noopener noreferrer" className={social}
                aria-label={`YouTube @${photographer.youtube}`}>
                <Youtube className="w-3.5 h-3.5" aria-hidden="true" /> @{photographer.youtube}
              </a>
            )}
            {photographer.tiktok && (
              <a href={`https://tiktok.com/@${photographer.tiktok}`} target="_blank" rel="noopener noreferrer" className={social}
                aria-label={`TikTok @${photographer.tiktok}`}>
                <Music className="w-3.5 h-3.5" aria-hidden="true" /> @{photographer.tiktok}
              </a>
            )}
          </div>
        </div>
      </header>

      <p className="hud mb-5">01 / Sessions</p>
      {/* Sessions grid */}
      {photographer.sessions.length === 0 ? (
        <p className="border-t border-line text-mute py-12">
          No published sessions yet
        </p>
      ) : (
        <div className="border-t border-line">
          {photographer.sessions.map((s) => (
            <div key={s.id} className="border-b border-line py-7">
              <Link
                href={`/sessions/${s.id}`}
                className="group block focus-visible:outline focus-visible:outline-1 focus-visible:outline-bone"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-bone group-hover:text-rec transition-colors">
                      {s.title}
                    </h2>
                    <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-dim mt-2 leading-relaxed">
                      <IconPin className={meta} />{s.location} · <IconCalendar className={meta} />
                      {format(new Date(s.date), "MMM d, yyyy")} ·{" "}
                      {s.startTime}–{s.endTime} · <IconCamera className={meta} />{s.photoCount} photos
                    </p>
                  </div>
                  <span className="hud flex items-center gap-1.5 group-hover:text-rec transition-colors flex-shrink-0">
                    View <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
                {/* Photo strip */}
                {s.photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {s.photos.map((p, i) => (
                      <div
                        key={i}
                        className="relative aspect-[4/3] overflow-hidden bg-char-3"
                      >
                        <img
                          src={getPreviewUrl(p.thumbnailKey)}
                          alt={`${s.title} preview ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
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
