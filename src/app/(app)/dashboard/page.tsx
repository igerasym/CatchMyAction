"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";
import EditSessionModal from "./edit-modal";
import { FolderOpen, ImageIcon, ShoppingCart, DollarSign, MapPin } from "lucide-react";

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
  photos: { thumbnailKey: string; thumbnailUrl?: string }[];
  _count: { photos: number };
}

interface Stats {
  sessions: number;
  photos: number;
  photosSold: number;
  revenue: number;
  recentSales: {
    id: string;
    amount: number;
    date: string;
    sessionTitle: string;
    buyerName: string;
    thumbnailUrl: string;
  }[];
}

export default function DashboardPage() {
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const user = authSession?.user as any;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [stripeConnected, setStripeConnected] = useState(true); // assume true until checked
  const [period, setPeriod] = useState("all");

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
    fetch(`/api/photographer/stats?period=${period}`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch("/api/stripe/connect")
      .then((r) => r.json())
      .then((data) => setStripeConnected(!!data.connected))
      .catch(() => {});
  }, [user?.id, period]);

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
      {/* Period filter */}
      <div className="flex gap-1 mb-4">
        {[
          { key: "today", label: "Today" },
          { key: "week", label: "This Week" },
          { key: "month", label: "This Month" },
          { key: "all", label: "All Time" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              period === p.key
                ? "bg-ocean-500 text-white"
                : "text-white/40 hover:text-white/60 hover:bg-white/5"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stripe nudge */}
      {stats && !stripeConnected && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-yellow-400 font-medium">Connect Stripe to get paid</p>
            <p className="text-xs text-white/30 mt-0.5">Athletes can browse your photos, but you won't receive payouts until Stripe is connected.</p>
          </div>
          <a href="/settings" className="px-4 py-2 bg-yellow-500 text-black text-xs rounded-lg hover:bg-yellow-400 transition-colors font-medium whitespace-nowrap">
            Connect Stripe
          </a>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard label="Sessions" value={stats.sessions} icon={<FolderOpen className="w-5 h-5 text-ocean-400" />} />
          <StatCard label="Photos" value={stats.photos} icon={<ImageIcon className="w-5 h-5 text-ocean-400" />} />
          <StatCard label="Photos Sold" value={stats.photosSold} icon={<ShoppingCart className="w-5 h-5 text-ocean-400" />} />
          <StatCard label="Revenue" value={`$${(stats.revenue / 100).toFixed(2)}`} icon={<DollarSign className="w-5 h-5 text-ocean-400" />} />
        </div>
      )}

      {/* Recent sales */}
      {stats && stats.recentSales.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-white/50 mb-3">Recent Sales</h2>
          <div className="space-y-2">
            {stats.recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                <div className="w-10 h-7 rounded overflow-hidden bg-white/5 flex-shrink-0">
                  <img src={sale.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{sale.sessionTitle}</p>
                  <p className="text-xs text-white/30">{sale.buyerName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-green-400 font-medium">${(sale.amount / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-white/20">{new Date(sale.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">My Sessions</h2>
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

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
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
  const [showQR, setShowQR] = useState(false);
  const thumbUrl = s.photos[0]?.thumbnailUrl || null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/sessions/${s.id}`}
              className="font-medium text-white hover:text-ocean-400 transition-colors truncate text-sm sm:text-base"
            >
              {s.title}
            </Link>
            <span
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ${
                s.published
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {s.published ? "Published" : "Draft"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/40 truncate">
            <MapPin className="w-3.5 h-3.5 inline mr-0.5" /> {s.location} · <ImageIcon className="w-3.5 h-3.5 inline mr-0.5" /> {s.photoCount} photos
          </p>
        </div>
      </div>

      {/* Actions — wrap on mobile */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
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
          onClick={() => setShowQR(true)}
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

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-1">Session QR Code</h2>
            <p className="text-sm text-white/40 mb-4">Athletes can scan this to find their photos</p>
            <div className="bg-white rounded-xl p-4 inline-block mb-4">
              <img src={`/api/sessions/${s.id}/qr`} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-white/30 mb-4 break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/sessions/${s.id}` : ""}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/sessions/${s.id}`);
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors"
              >
                Copy Link
              </button>
              <a
                href={`/api/sessions/${s.id}/qr`}
                download={`session-${s.id}-qr.svg`}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm"
              >
                Download QR
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
