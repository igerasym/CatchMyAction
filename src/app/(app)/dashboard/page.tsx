"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import EditSessionModal from "./edit-modal";
import {
  FolderOpen, ImageIcon, ShoppingCart, DollarSign, MapPin,
  TrendingUp, Camera, Eye,
} from "lucide-react";
import { toastError, toastWarning } from "@/lib/toast";

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
  viewCount: number;
  photos: { thumbnailKey: string; thumbnailUrl?: string }[];
  _count: { photos: number };
}

interface Stats {
  sessions: number;
  photos: number;
  photosSold: number;
  revenue: number;
  totalViews: number;
  recentSales: any[];
}

interface Earnings {
  totalGross: number;
  totalNet: number;
  platformFee: number;
  totalSales: number;
  dailyRevenue: { date: string; gross: number; net: number }[];
  perSession: {
    id: string; title: string; location: string;
    sales: number; gross: number; net: number; views: number;
  }[];
  transactions: {
    id: string; amount: number; net: number; date: string;
    buyerName: string; sessionTitle: string; thumbnailUrl: string;
  }[];
}

export default function DashboardPage() {
  const { data: authSession, status } = useSession();
  const router = useRouter();
  const user = authSession?.user as any;

  const [tab, setTab] = useState<"sessions" | "earnings">("sessions");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<"none" | "incomplete" | "active">("active");
  const [earningsRange, setEarningsRange] = useState("30");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/dashboard");
    if (status === "authenticated" && user?.role !== "PHOTOGRAPHER") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/photographer/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .finally(() => setLoading(false));
    fetch("/api/photographer/stats?period=all&t=" + Date.now())
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch("/api/stripe/connect")
      .then((r) => r.json())
      .then((data) => {
        const connected = !!data.connected && !!data.chargesEnabled;
        setStripeConnected(connected);
        setStripeStatus(data.connected ? (data.chargesEnabled ? "active" : "incomplete") : "none");
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (tab !== "earnings" || !user?.id) return;
    setEarningsLoading(true);
    fetch(`/api/photographer/earnings?range=${earningsRange}`)
      .then((r) => r.json())
      .then(setEarnings)
      .finally(() => setEarningsLoading(false));
  }, [tab, earningsRange, user?.id]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this session and all its photos? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
    refreshStats();
  }

  async function handleTogglePublish(id: string, published: boolean) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.needsVerification) toastWarning("Verify your email to publish sessions. Go to Settings → Profile.");
      else toastError(data.error || "Failed to update");
      return;
    }
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, published: !published } : s)));
    refreshStats();
  }

  function refreshStats() {
    fetch(`/api/photographer/stats?period=all&t=${Date.now()}`).then((r) => r.json()).then(setStats).catch(() => {});
  }

  async function handleSaveEdit(id: string, data: Record<string, any>) {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    setEditSession(null);
  }

  if (status !== "authenticated" || user?.role !== "PHOTOGRAPHER") {
    return (
      <div className="space-y-6">
        <div className="flex gap-2"><div className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" /><div className="ml-auto h-10 w-32 bg-white/5 rounded-lg animate-pulse" /></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white/5 border border-white/10 rounded-xl h-20 animate-pulse" />)}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-white/5 border border-white/10 rounded-xl h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const published = sessions.filter((s) => s.published).length;
  const drafts = sessions.length - published;

  return (
    <div>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center bg-white/5 rounded-lg p-0.5">
          {(["sessions", "earnings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm rounded-md transition-all ${
                tab === t ? "bg-white/10 text-white font-medium shadow-sm" : "text-white/40 hover:text-white/60"
              }`}>
              {t === "sessions" ? (
                <><FolderOpen className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />Sessions</>
              ) : (
                <><DollarSign className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />Earnings</>
              )}
            </button>
          ))}
        </div>
        <Link href="/upload"
          className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm">
          + New Session
        </Link>
      </div>

      {/* Stripe nudge */}
      {!stripeConnected && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-yellow-400 font-medium">
              {stats && stats.photosSold > 0
                ? `You have $${((stats.revenue * 0.82) / 100).toFixed(2)} in earnings`
                : stripeStatus === "incomplete" ? "Complete your Stripe setup to receive payouts" : "Connect Stripe to get paid"}
            </p>
            <p className="text-xs text-white/30 mt-0.5">You keep 82% of each sale.</p>
          </div>
          <a href="/settings" className="px-4 py-2 bg-yellow-500 text-black text-xs rounded-lg hover:bg-yellow-400 transition-colors font-medium whitespace-nowrap">
            {stripeStatus === "incomplete" ? "Complete Setup" : "Connect Stripe"}
          </a>
        </div>
      )}

      {tab === "sessions" ? (
        <SessionsTab
          stats={stats} sessions={sessions} loading={loading}
          deleting={deleting} published={published} drafts={drafts}
          onEdit={setEditSession} onDelete={handleDelete}
          onTogglePublish={handleTogglePublish}
        />
      ) : (
        <EarningsTab data={earnings} loading={earningsLoading}
          range={earningsRange} setRange={setEarningsRange} />
      )}

      {editSession && (
        <EditSessionModal session={editSession}
          onSave={(data) => handleSaveEdit(editSession.id, data)}
          onClose={() => setEditSession(null)} />
      )}
    </div>
  );
}

/* ─── Sessions Tab ─── */
function SessionsTab({ stats, sessions, loading, deleting, published, drafts, onEdit, onDelete, onTogglePublish }: {
  stats: Stats | null; sessions: Session[]; loading: boolean;
  deleting: string | null; published: number; drafts: number;
  onEdit: (s: Session) => void; onDelete: (id: string) => void;
  onTogglePublish: (id: string, pub: boolean) => void;
}) {
  return (
    <>
      {/* Overview cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <MiniCard icon={<FolderOpen className="w-4 h-4 text-ocean-400" />}
            value={stats.sessions} label="Sessions"
            detail={`${published} live · ${drafts} draft`} />
          <MiniCard icon={<Camera className="w-4 h-4 text-ocean-400" />}
            value={stats.photos} label="Photos" />
          <MiniCard icon={<ShoppingCart className="w-4 h-4 text-green-400" />}
            value={stats.photosSold} label="Sold" />
          <MiniCard icon={<Eye className="w-4 h-4 text-white/40" />}
            value={stats.totalViews} label="Views" />
          <MiniCard icon={<DollarSign className="w-4 h-4 text-green-400" />}
            value={`$${(stats.revenue / 100).toFixed(2)}`} label="Total Revenue" />
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40 mb-2">No sessions yet</p>
          <Link href="/upload" className="text-ocean-400 hover:underline text-sm">Create your first session →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} deleting={deleting === s.id}
              onEdit={() => onEdit(s)} onDelete={() => onDelete(s.id)}
              onTogglePublish={() => onTogglePublish(s.id, s.published)} />
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Earnings Tab ─── */
function EarningsTab({ data, loading, range, setRange }: {
  data: Earnings | null; loading: boolean; range: string; setRange: (r: string) => void;
}) {
  return (
    <>
      {/* Range pills */}
      <div className="flex gap-1 mb-5">
        {[
          { key: "7", label: "7d" },
          { key: "30", label: "30d" },
          { key: "90", label: "90d" },
          { key: "all", label: "All" },
        ].map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              range === r.key ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white/60 hover:bg-white/5"
            }`}>{r.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 h-28 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Earnings cards — 2 columns */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="rounded-xl p-5 border bg-green-500/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-xs text-white/40">Your Earnings</span>
              </div>
              <p className="text-3xl font-bold text-green-400">${(data.totalNet / 100).toFixed(2)}</p>
              <p className="text-xs text-white/25 mt-1">
                {data.totalSales > 0 ? `avg $${(data.totalNet / data.totalSales / 100).toFixed(2)} per photo` : "no sales yet"}
              </p>
            </div>
            <div className="rounded-xl p-5 border bg-white/5 border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-5 h-5 text-ocean-400" />
                <span className="text-xs text-white/40">Photos Sold</span>
              </div>
              <p className="text-3xl font-bold text-white">{data.totalSales}</p>
              <p className="text-xs text-white/25 mt-1">
                {data.totalSales > 0 ? `$${(data.totalGross / 100).toFixed(2)} total sales` : "no sales yet"}
              </p>
            </div>
          </div>

          {/* Revenue chart */}
          {data.dailyRevenue.length > 1 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-white/40 mb-3">Earnings Over Time</h2>
              <RevenueChart data={data.dailyRevenue} />
            </div>
          )}

          {/* Per-session breakdown */}
          {data.perSession.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-white/40 mb-3">By Session</h2>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1fr_60px_80px_80px_80px] gap-2 px-4 py-2 text-[11px] text-white/25 uppercase tracking-wider border-b border-white/5">
                  <span>Session</span>
                  <span className="text-right">Views</span>
                  <span className="text-right">Sales</span>
                  <span className="text-right">Gross</span>
                  <span className="text-right">Net</span>
                </div>
                {data.perSession.map((s) => (
                  <Link key={s.id} href={`/sessions/${s.id}`}
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_60px_80px_80px_80px] gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <p className="text-white truncate">{s.title}</p>
                      <p className="text-xs text-white/25 truncate">{s.location}</p>
                    </div>
                    <div className="text-right sm:contents">
                      <span className="hidden sm:block text-right text-white/30">{s.views}</span>
                      <span className="hidden sm:block text-right text-white/50">{s.sales}</span>
                      <span className="hidden sm:block text-right text-white/50">${(s.gross / 100).toFixed(2)}</span>
                      <span className="text-right text-green-400 font-medium">${(s.net / 100).toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {data.transactions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-medium text-white/40 mb-3">Recent Transactions</h2>
              <div className="space-y-1.5">
                {data.transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-2.5">
                    <div className="w-9 h-7 rounded overflow-hidden bg-white/5 flex-shrink-0">
                      <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{t.sessionTitle}</p>
                      <p className="text-[11px] text-white/25">{t.buyerName} · {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-sm text-green-400 font-medium flex-shrink-0">${(t.net / 100).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.totalSales === 0 && (
            <div className="text-center py-20">
              <DollarSign className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 mb-2">No sales yet</p>
              <p className="text-sm text-white/20">When athletes purchase your photos, earnings will appear here.</p>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}

/* ─── Shared Components ─── */
function MiniCard({ icon, value, label, detail }: {
  icon: React.ReactNode; value: string | number; label: string; detail?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 mb-0.5">
        {icon}
        <span className="text-[11px] text-white/35 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {detail && <p className="text-[11px] text-white/20 mt-0.5">{detail}</p>}
    </div>
  );
}

function RevenueChart({ data }: { data: { date: string; gross: number; net: number }[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 24, right: 12, bottom: 28, left: 48 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map((d) => d.gross), 100);

    ctx.clearRect(0, 0, w, h);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(`$${((maxVal - (maxVal / 4) * i) / 100).toFixed(0)}`, pad.left - 8, y + 3);
    }

    // X labels
    const step = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = pad.left + (i / (data.length - 1)) * chartW;
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(new Date(d.date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" }), x, h - 6);
      }
    });

    function drawArea(values: number[], lineColor: string, fillColor: string) {
      if (values.length < 2) return;
      // Fill
      const fill = new Path2D();
      values.forEach((val, i) => {
        const x = pad.left + (i / (values.length - 1)) * chartW;
        const y = pad.top + chartH - (val / maxVal) * chartH;
        i === 0 ? fill.moveTo(x, y) : fill.lineTo(x, y);
      });
      fill.lineTo(pad.left + chartW, pad.top + chartH);
      fill.lineTo(pad.left, pad.top + chartH);
      fill.closePath();
      const grad = ctx!.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, fillColor);
      grad.addColorStop(1, "transparent");
      ctx!.fillStyle = grad;
      ctx!.fill(fill);
      // Line
      ctx!.beginPath();
      values.forEach((val, i) => {
        const x = pad.left + (i / (values.length - 1)) * chartW;
        const y = pad.top + chartH - (val / maxVal) * chartH;
        i === 0 ? ctx!.moveTo(x, y) : ctx!.lineTo(x, y);
      });
      ctx!.strokeStyle = lineColor;
      ctx!.lineWidth = 2;
      ctx!.stroke();
    }

    drawArea(data.map((d) => d.net), "#22c55e", "rgba(34,197,94,0.08)");

  }, [data]);

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
      <canvas ref={canvasRef} className="w-full" style={{ height: 200 }} />
    </div>
  );
}

function SessionRow({
  session: s, deleting, onEdit, onDelete, onTogglePublish,
}: {
  session: Session; deleting: boolean;
  onEdit: () => void; onDelete: () => void; onTogglePublish: () => void;
}) {
  const [showQR, setShowQR] = useState(false);
  const thumbUrl = s.photos[0]?.thumbnailUrl || null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/sessions/${s.id}`}
              className="font-medium text-white hover:text-ocean-400 transition-colors truncate text-sm sm:text-base">
              {s.title}
            </Link>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ${
              s.published ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
            }`}>{s.published ? "Live" : "Draft"}</span>
          </div>
          <p className="text-xs sm:text-sm text-white/40 truncate">
            <MapPin className="w-3.5 h-3.5 inline mr-0.5" /> {s.location} · {s.photoCount} photos · <Eye className="w-3.5 h-3.5 inline mr-0.5" /> {s.viewCount}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button onClick={onTogglePublish}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors">
          {s.published ? "Unpublish" : "Publish"}</button>
        <button onClick={onEdit}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors">Edit</button>
        <button onClick={() => setShowQR(true)}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors">QR</button>
        <Link href={`/dashboard/sessions/${s.id}`}
          className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:bg-white/10 transition-colors">Photos</Link>
        <button onClick={onDelete} disabled={deleting}
          className="px-3 py-1.5 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors ml-auto">
          {deleting ? "..." : "Delete"}</button>
      </div>
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
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/sessions/${s.id}`)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-colors">Copy Link</button>
              <a href={`/api/sessions/${s.id}/qr`} download={`session-${s.id}-qr.svg`}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-400 transition-colors text-sm">Download QR</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
