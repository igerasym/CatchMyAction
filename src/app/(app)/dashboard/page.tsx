"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import EditSessionModal from "./edit-modal";

interface Session {
  id: string;
  title: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string | null;
  published: boolean;
  photoCount: number;
  photos: { thumbnailKey: string }[];
  _count: { photos: number };
}

export default function DashboardPage() {
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const user = authSession?.user as any;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/dashboard");
    if (status === "authenticated" && user?.role !== "PHOTOGRAPHER") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/photographer/sessions?userId=${user.id}`)
      .then((r) => r.json())
      .then(setSessions)
      .finally(() => setLoading(false));
  }, [user?.id]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this session and all its photos? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  async function handleTogglePublish(id: string, published: boolean) {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, published: !published } : s))
    );
  }

  async function handleSaveEdit(id: string, data: Record<string, any>) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
    setEditSession(null);
  }

  if (status !== "authenticated" || user?.role !== "PHOTOGRAPHER") {
    return <p className="text-center py-12 text-white/40">Loading...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">My Sessions</h1>
        <Link
          href="/upload"
          className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm"
        >
          + New Session
        </Link>
      </div>

      {loading ? (
        <p className="text-white/40 text-center py-12">Loading sessions...</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/40 mb-4">No sessions yet</p>
          <Link href="/upload" className="text-ocean-400 hover:underline">
            Create your first session →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              deleting={deleting === s.id}
              onEdit={() => setEditSession(s)}
              onDelete={() => handleDelete(s.id)}
              onTogglePublish={() => handleTogglePublish(s.id, s.published)}
            />
          ))}
        </div>
      )}

      {editSession && (
        <EditSessionModal
          session={editSession}
          onSave={(data) => handleSaveEdit(editSession.id, data)}
          onClose={() => setEditSession(null)}
        />
      )}
    </div>
  );
}

function SessionRow({
  session: s,
  deleting,
  onEdit,
  onDelete,
  onTogglePublish,
}: {
  session: Session;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
}) {
  const thumbUrl = s.photos[0]
    ? `/uploads/previews/${s.photos[0].thumbnailKey}`
    : null;

  return (
    <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
      {/* Thumbnail */}
      <div className="w-20 h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">📸</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/sessions/${s.id}`}
            className="font-medium text-white hover:text-ocean-400 transition-colors truncate"
          >
            {s.title}
          </Link>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              s.published
                ? "bg-green-500/20 text-green-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            {s.published ? "Published" : "Draft"}
          </span>
        </div>
        <p className="text-sm text-white/40 truncate">
          📍 {s.location} · 📅 {format(new Date(s.date), "MMM d, yyyy")} · 📸{" "}
          {s.photoCount} photos
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onTogglePublish}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
          title={s.published ? "Unpublish" : "Publish"}
        >
          {s.published ? "Unpublish" : "Publish"}
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => window.open(`/api/sessions/${s.id}/qr`, "_blank")}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
          title="QR Code"
        >
          QR
        </button>
        <Link
          href={`/dashboard/sessions/${s.id}`}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors"
        >
          Photos
        </Link>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
        >
          {deleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
