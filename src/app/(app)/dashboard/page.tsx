"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import EditSessionModal from "./edit-modal";
import dynamic from "next/dynamic";
import {
  FolderOpen, ImageIcon, ShoppingCart, DollarSign, MapPin,
  TrendingUp, Camera, Eye,
} from "lucide-react";
import { toastError, toastWarning, toastSuccess } from "@/lib/toast";
import { PageIntro } from "../ui";

const LocationPicker = dynamic(() => import("@/app/components/location-picker"), { ssr: false });

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
  pendingPayout: number;
  freeSalesLeft?: number;
  totalViews: number;
  recentSales: any[];
}

interface Earnings {
  totalGross: number;
  totalNet: number;
  sentNet: number;
  pendingNet: number;
  heldNet: number;
  platformFee: number;
  totalSales: number;
  freeSalesLeft?: number;
  dailyRevenue: { date: string; gross: number; net: number }[];
  perSession: {
    id: string; title: string; location: string;
    sales: number; gross: number; net: number; views: number;
  }[];
  transactions: {
    id: string; amount: number; net: number; payout: "sent" | "pending" | "held"; date: string;
    buyerName: string; sessionTitle: string; thumbnailUrl: string;
  }[];
}

/**
 * Fee copy. Mirrors FREE_SALES_PER_PHOTOGRAPHER (5) and PLATFORM_FEE_BPS (18%) in
 * src/lib/stripe.ts; that module is server-only, so the numbers are repeated here.
 */
const FEE_POLICY = "Your first 5 sales are commission-free. After that you keep 82% of every sale.";

function freeSalesNote(left: number | undefined): string | null {
  if (left === undefined || left <= 0) return null;
  return `${left} commission-free ${left === 1 ? "sale" : "sales"} left`;
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
  const [locationPickerSession, setLocationPickerSession] = useState<{ id: string; location: string } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login?callbackUrl=/dashboard");
    if (status === "authenticated" && user?.role !== "PHOTOGRAPHER") router.push("/");
  }, [status, user, router]);

  useEffect(() => {
    if (!user?.id) return;
    // Load sessions + stats in parallel (fast, local DB)
    Promise.all([
      fetch("/api/photographer/sessions").then((r) => r.json()),
      fetch(`/api/photographer/stats?period=all&t=${Date.now()}`).then((r) => r.json()),
    ]).then(([sessionsData, statsData]) => {
      setSessions(sessionsData);
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Stripe status — separate, non-blocking (external API, slower)
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
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toastError(data.error || "Couldn't delete the session");
      setDeleting(null);
      return;
    }
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
    if (!published) {
      toastSuccess(
        data.notified > 0
          ? `Session is live — ${data.notified} ${data.notified === 1 ? "person" : "people"} notified`
          : "Session is live"
      );
    }
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
    if (!res.ok) {
      toastError(updated.error || "Failed to save changes");
      return;
    }
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    setEditSession(null);
    if (updated.needsLocation) {
      setLocationPickerSession({ id, location: data.location || "" });
    }
  }

  if (status !== "authenticated" || user?.role !== "PHOTOGRAPHER") {
    return (
      <div className="space-y-6">
        <div className="flex gap-2" role="status" aria-label="Loading dashboard"><div className="h-10 w-32 bg-char-2 border border-line animate-pulse" /><div className="ml-auto h-10 w-32 bg-char-2 border border-line animate-pulse" /></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-char-2 border border-line animate-pulse h-20" />)}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="bg-char-2 border border-line animate-pulse h-24" />)}
        </div>
      </div>
    );
  }

  const published = sessions.filter((s) => s.published).length;
  const drafts = sessions.length - published;

  return (
    <div className="py-4 md:py-8">
      <PageIntro kicker="Studio / Dashboard" title="Your sessions" className="mb-10" />
      {/* Header with tabs */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8 border-b border-line">
        <div className="flex items-center" role="tablist" aria-label="Dashboard sections">
          {(["sessions", "earnings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} role="tab" aria-selected={tab === t}
              className={`-mb-px px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                tab === t ? "border-rec text-bone" : "border-transparent text-dim hover:text-bone"
              }`}>
              {t === "sessions" ? (
                <><FolderOpen className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" aria-hidden="true" />Sessions</>
              ) : (
                <><DollarSign className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" aria-hidden="true" />Earnings</>
              )}
            </button>
          ))}
        </div>
        <Link href="/upload" className="btn-pri py-3 px-5 text-sm mb-2">
          + New session
        </Link>
      </div>

      {/* Stripe nudge */}
      {!stripeConnected && (
        <div className="mb-8 p-4 bg-ink border border-line border-l-2 border-l-rec flex flex-wrap items-center justify-between gap-4" role="status">
          <div>
            <p className="text-sm text-bone font-bold">
              {stats && stats.pendingPayout > 0
                ? `$${(stats.pendingPayout / 100).toFixed(2)} is waiting for you`
                : stripeStatus === "incomplete" ? "Complete your Stripe setup to receive payouts" : "Connect Stripe to get paid"}
            </p>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-dim mt-1">
              {stats && stats.pendingPayout > 0 ? `Connect Stripe so we can send it. ${FEE_POLICY}` : FEE_POLICY}
            </p>
            {freeSalesNote(stats?.freeSalesLeft) && (
              <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-rec mt-1">
                {freeSalesNote(stats?.freeSalesLeft)}
              </p>
            )}
          </div>
          <a href="/settings" className="btn-rec py-2.5 px-4 text-sm whitespace-nowrap">
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

      {locationPickerSession && (
        <LocationPicker
          locationName={locationPickerSession.location}
          onSelect={async (lat, lng) => {
            await fetch(`/api/sessions/${locationPickerSession.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ locationLat: lat, locationLng: lng }),
            });
            setLocationPickerSession(null);
          }}
          onClose={() => setLocationPickerSession(null)}
        />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-line border border-line mb-8">
          <MiniCard icon={<FolderOpen className="w-4 h-4 text-dim" aria-hidden="true" />}
            value={stats.sessions} label="Sessions"
            detail={`${published} live · ${drafts} draft`} />
          <MiniCard icon={<Camera className="w-4 h-4 text-dim" aria-hidden="true" />}
            value={stats.photos} label="Photos" />
          <MiniCard icon={<ShoppingCart className="w-4 h-4 text-dim" aria-hidden="true" />}
            value={stats.photosSold} label="Sold" />
          <MiniCard icon={<Eye className="w-4 h-4 text-dim" aria-hidden="true" />}
            value={stats.totalViews} label="Views" />
          <MiniCard icon={<DollarSign className="w-4 h-4 text-rec" aria-hidden="true" />}
            value={`$${(stats.revenue / 100).toFixed(2)}`} label="Total Revenue" />
        </div>
      )}

      {/* Photographer QR Code */}
      <PhotographerQR />

      {/* Session list */}
      {loading ? (
        <div className="space-y-2" role="status" aria-label="Loading sessions">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-char-2 border border-line animate-pulse p-4 h-20" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="border-t border-line py-20 text-center">
          <FolderOpen className="w-10 h-10 text-dim mx-auto mb-5" aria-hidden="true" />
          <p className="text-mute mb-6">No sessions yet</p>
          <Link href="/upload" className="btn-pri">Create your first session →</Link>
        </div>
      ) : (
        <div className="border-t border-line">
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
      <div className="flex gap-px mb-8 border border-line w-fit" role="group" aria-label="Earnings range">
        {[
          { key: "7", label: "7d" },
          { key: "30", label: "30d" },
          { key: "90", label: "90d" },
          { key: "all", label: "All" },
        ].map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)} aria-pressed={range === r.key}
            className={`px-4 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
              range === r.key ? "bg-bone text-ink font-bold" : "text-dim hover:text-bone hover:bg-char-2"
            }`}>{r.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2 mb-8" role="status" aria-label="Loading earnings">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-char-2 border border-line animate-pulse p-4 h-28" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Earnings cards — 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-line border border-line mb-3">
            <div className="relative p-6 bg-char-2">
              <div className="brk brk-rec brk-sm" aria-hidden="true" />
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-rec" aria-hidden="true" />
                <span className="hud">Your earnings</span>
              </div>
              <p className="disp text-4xl text-bone mt-1">${(data.totalNet / 100).toFixed(2)}</p>
              <p className="font-mono text-[11px] tracking-[0.06em] text-dim mt-2">
                {data.totalSales > 0 ? `avg $${(data.totalNet / data.totalSales / 100).toFixed(2)} per photo` : "no sales yet"}
              </p>
              {data.totalSales > 0 && (
                <p className="font-mono text-[11px] tracking-[0.06em] mt-3 space-y-1">
                  <span className="block text-bone">Sent to your Stripe: ${(data.sentNet / 100).toFixed(2)}</span>
                  {data.pendingNet > 0 && (
                    <span className="block text-rec">Waiting for Stripe setup: ${(data.pendingNet / 100).toFixed(2)}</span>
                  )}
                  {data.heldNet > 0 && (
                    <span className="block text-dim">On hold (refunded or disputed): ${(data.heldNet / 100).toFixed(2)}</span>
                  )}
                </p>
              )}
            </div>
            <div className="p-6 bg-char-2">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-dim" aria-hidden="true" />
                <span className="hud">Photos sold</span>
              </div>
              <p className="disp text-4xl text-bone mt-1">{data.totalSales}</p>
              <p className="font-mono text-[11px] tracking-[0.06em] text-dim mt-2">
                {data.totalSales > 0 ? `$${(data.totalGross / 100).toFixed(2)} total sales` : "no sales yet"}
              </p>
            </div>
          </div>
          <p className="font-mono text-[11px] tracking-[0.06em] text-dim mb-10">
            {FEE_POLICY}
            {freeSalesNote(data.freeSalesLeft) && (
              <span className="block text-rec mt-1">{freeSalesNote(data.freeSalesLeft)}</span>
            )}
          </p>

          {/* Revenue chart */}
          {data.dailyRevenue.length > 1 && (
            <div className="mb-8">
              <h2 className="hud mb-4">01 / Earnings over time</h2>
              <RevenueChart data={data.dailyRevenue} />
            </div>
          )}

          {/* Per-session breakdown */}
          {data.perSession.length > 0 && (
            <div className="mb-8">
              <h2 className="hud mb-4">02 / By session</h2>
              <div className="border-t border-line">
                <div className="hidden sm:grid grid-cols-[1fr_60px_80px_80px_80px] gap-2 px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] uppercase text-dim border-b border-line">
                  <span>Session</span>
                  <span className="text-right">Views</span>
                  <span className="text-right">Sales</span>
                  <span className="text-right">Gross</span>
                  <span className="text-right">Net</span>
                </div>
                {data.perSession.map((s) => (
                  <Link key={s.id} href={`/sessions/${s.id}`}
                    className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_60px_80px_80px_80px] gap-2 px-4 py-3.5 text-sm hover:bg-char-2 transition-colors border-b border-line group">
                    <div className="min-w-0">
                      <p className="text-bone font-bold truncate group-hover:text-rec transition-colors">{s.title}</p>
                      <p className="font-mono text-[11px] tracking-[0.08em] uppercase text-dim truncate mt-0.5">{s.location}</p>
                    </div>
                    <div className="text-right sm:contents">
                      <span className="hidden sm:block text-right font-mono text-dim">{s.views}</span>
                      <span className="hidden sm:block text-right font-mono text-mute">{s.sales}</span>
                      <span className="hidden sm:block text-right font-mono text-mute">${(s.gross / 100).toFixed(2)}</span>
                      <span className="text-right font-mono text-bone font-bold">${(s.net / 100).toFixed(2)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          {data.transactions.length > 0 && (
            <div className="mb-8">
              <h2 className="hud mb-4">03 / Recent transactions</h2>
              <div className="border-t border-line">
                {data.transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 border-b border-line px-4 py-3">
                    <div className="w-12 h-9 overflow-hidden bg-char-3 flex-shrink-0">
                      <img src={t.thumbnailUrl} alt={`Sold photo from ${t.sessionTitle}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-bone truncate">{t.sessionTitle}</p>
                      <p className="font-mono text-[11px] tracking-[0.06em] text-dim mt-0.5">{t.buyerName} · {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-sm text-bone font-bold">+${(t.net / 100).toFixed(2)}</p>
                      <p className={`font-mono text-[10px] tracking-[0.1em] uppercase mt-0.5 ${t.payout === "pending" ? "text-rec" : "text-dim"}`}>
                        {t.payout === "pending" ? "Waiting for Stripe" : t.payout === "held" ? "On hold" : "Sent"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.totalSales === 0 && (
            <div className="text-center py-20 border-t border-line">
              <DollarSign className="w-10 h-10 text-dim mx-auto mb-5" aria-hidden="true" />
              <p className="text-mute mb-2">No sales yet</p>
              <p className="text-sm text-dim">When athletes purchase your photos, earnings will appear here.</p>
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
    <div className="bg-char-2 px-4 py-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="hud">{label}</span>
      </div>
      <p className="disp text-2xl text-bone">{value}</p>
      {detail && <p className="font-mono text-[11px] tracking-[0.06em] text-dim mt-1.5">{detail}</p>}
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
      ctx.strokeStyle = "#383a40"; // line
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.fillStyle = "#948f86"; // dim
      ctx.font = "10px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText(`$${((maxVal - (maxVal / 4) * i) / 100).toFixed(0)}`, pad.left - 8, y + 3);
    }

    // X labels
    const step = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = pad.left + (i / (data.length - 1)) * chartW;
        ctx.fillStyle = "#948f86"; // dim
        ctx.font = "10px ui-monospace, monospace";
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

    drawArea(data.map((d) => d.net), "#ff4433", "rgba(255,68,51,0.14)"); // rec

  }, [data]);

  return (
    <div className="bg-char-2 border border-line p-4">
      <canvas ref={canvasRef} className="w-full" style={{ height: 200 }} role="img" aria-label={`Net earnings chart, ${data.length} days`} />
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
  const [showMenu, setShowMenu] = useState(false);
  const thumbUrl = s.photos[0]?.thumbnailUrl || null;
  const sessionDate = s.date ? new Date(s.date).toLocaleDateString("en", { month: "short", day: "numeric" }) : "";

  return (
    <div className="border-b border-line py-4 px-1 sm:px-2 hover:bg-char-2 transition-colors">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/sessions/${s.id}`} aria-label={`Manage ${s.title}`} className="group relative w-16 h-12 sm:w-20 sm:h-14 overflow-hidden bg-char-3 flex-shrink-0">
          <span className="brk brk-sm brk-hover z-10" aria-hidden="true" />
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-dim">
              <ImageIcon className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/sessions/${s.id}`}
              className="font-bold text-bone hover:text-rec transition-colors truncate text-sm sm:text-base">
              {s.title}
            </Link>
            <span className={`flex-shrink-0 ${s.published ? "tag-rec" : "tag-ghost border border-line"}`}>
              {s.published ? "LIVE" : "DRAFT"}
            </span>
          </div>
          <p className="text-sm text-mute truncate mt-1">
            <MapPin className="w-3 h-3 inline mr-1 text-dim" aria-hidden="true" />{s.location} · {sessionDate}
          </p>
          <div className="flex gap-4 mt-1 font-mono text-[11px] tracking-[0.08em] uppercase text-dim">
            <span>{s.photoCount} photos</span>
            <span><Eye className="w-3 h-3 inline mr-1 -mt-0.5" aria-hidden="true" />{s.viewCount} views</span>
          </div>
        </div>

        {/* Actions — compact */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onTogglePublish}
            className={`px-3 py-2 text-xs font-bold transition-colors ${
              s.published
                ? "border border-line text-mute hover:text-bone hover:border-bone"
                : "bg-bone text-ink hover:bg-white"
            }`}>
            {s.published ? "Unpublish" : "Publish"}
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              aria-label={`More actions for ${s.title}`} aria-haspopup="menu" aria-expanded={showMenu}
              className="w-9 h-9 flex items-center justify-center border border-line text-mute hover:text-bone hover:border-bone transition-colors">
              <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div role="menu" className="absolute right-0 top-full mt-px w-44 bg-ink border border-line shadow-xl z-50 py-1">
                  <button onClick={() => { onEdit(); setShowMenu(false); }}
                    role="menuitem" className="w-full text-left px-3.5 py-2.5 text-sm text-mute hover:text-bone hover:bg-char-2 transition-colors">Edit Session</button>
                  <button onClick={() => { setShowQR(true); setShowMenu(false); }}
                    role="menuitem" className="w-full text-left px-3.5 py-2.5 text-sm text-mute hover:text-bone hover:bg-char-2 transition-colors">QR Code</button>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/sessions/${s.id}`); setShowMenu(false); toastSuccess("Link copied!"); }}
                    role="menuitem" className="w-full text-left px-3.5 py-2.5 text-sm text-mute hover:text-bone hover:bg-char-2 transition-colors">Copy Link</button>
                  <Link href={`/dashboard/sessions/${s.id}`} onClick={() => setShowMenu(false)}
                    role="menuitem" className="block px-3.5 py-2.5 text-sm text-mute hover:text-bone hover:bg-char-2 transition-colors">Manage Photos</Link>
                  <div className="border-t border-line my-1" />
                  <button onClick={() => { onDelete(); setShowMenu(false); }} disabled={deleting}
                    role="menuitem" className="w-full text-left px-3.5 py-2.5 text-sm text-rec hover:bg-char-2 disabled:opacity-50 transition-colors">
                    {deleting ? "Deleting..." : "Delete Session"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div role="dialog" aria-modal="true" className="relative bg-char-2 border border-line p-7 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="hud mb-3">QR / Session</p>
            <h2 className="disp text-2xl text-bone mb-2">Session QR code<span className="text-rec">.</span></h2>
            <p className="text-sm text-mute mb-5">Athletes can scan this to find their photos</p>
            <div className="bg-bone p-4 inline-block mb-4">
              <img src={`/api/sessions/${s.id}/qr`} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="font-mono text-[11px] text-dim mb-5 break-all">
              {typeof window !== "undefined" ? `${window.location.origin}/sessions/${s.id}` : ""}
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/sessions/${s.id}`)}
                className="btn-sec py-2.5 px-4 text-sm">Copy Link</button>
              <a href={`/api/sessions/${s.id}/qr`} download={`session-${s.id}-qr.svg`}
                className="btn-pri py-2.5 px-4 text-sm">Download QR</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotographerQR() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [showQR, setShowQR] = useState(false);

  if (!user?.id) return null;

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.origin}/photographer/${user.id}`
    : "";

  return (
    <>
      <div className="mb-10 flex flex-wrap gap-3 items-center justify-between bg-char-2 border border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-bone p-1 flex-shrink-0">
            <img src="/api/photographer/qr" alt="" className="w-full h-full" />
          </div>
          <div>
            <p className="text-sm text-bone font-bold">Your profile QR code</p>
            <p className="font-mono text-[11px] tracking-[0.04em] text-dim mt-0.5">Print it on a t-shirt, sticker, or business card</p>
          </div>
        </div>
        <button onClick={() => setShowQR(true)}
          className="btn-sec py-2 px-3.5 text-xs">
          View & Download
        </button>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-ink/85 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div role="dialog" aria-modal="true" className="relative bg-char-2 border border-line p-7 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="hud mb-3">QR / Profile</p>
            <h2 className="disp text-2xl text-bone mb-2">Your profile QR<span className="text-rec">.</span></h2>
            <p className="text-sm text-mute mb-5">Athletes scan this to see all your sessions</p>
            <div className="bg-bone p-4 inline-block mb-4">
              <img src="/api/photographer/qr" alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="font-mono text-[11px] text-dim mb-5 break-all">{profileUrl}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => { navigator.clipboard.writeText(profileUrl); toastSuccess("Link copied!"); }}
                className="btn-sec py-2.5 px-4 text-sm">
                Copy Link
              </button>
              <a href="/api/photographer/qr" download="my-qr-code.svg"
                className="btn-pri py-2.5 px-4 text-sm">
                Download QR
              </a>
            </div>
            <p className="font-mono text-[11px] text-dim mt-5">
              Print on t-shirts, stickers, business cards, or show at the spot
            </p>
          </div>
        </div>
      )}
    </>
  );
}
