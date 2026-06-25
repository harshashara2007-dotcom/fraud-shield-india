import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";
import { RefreshCw, Download, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Fraud Analytics — ScanScam" }] }),
  component: AnalyticsScreen,
});

const TYPE_COLORS: Record<string, string> = {
  "UPI Fraud": "#FF2D55",
  "KYC Scam": "#FF9500",
  "Job Scam": "#007AFF",
  "Lottery": "#FFD700",
  "Fake Police": "#8B00FF",
  "Fake Bank": "#00C853",
  "Investment": "#FF6B6B",
  "Phone": "#8899aa",
  "Other": "#8899aa",
};

type Report = {
  id: string;
  type: string | null;
  city: string | null;
  created_at: string;
};

function AnalyticsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [recent, setRecent] = useState<Report[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("scam_reports")
      .select("id,type,city,created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data) setReports(data as Report[]);
    setRecent((data ?? []).slice(0, 5) as Report[]);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    const channel = supabase
      .channel("analytics-reports")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scam_reports" }, (p) => {
        const row = p.new as Report;
        setRecent((r) => [row, ...r].slice(0, 5));
        setReports((r) => [row, ...r]);
      })
      .subscribe();
    return () => {
      clearInterval(id);
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 86_400_000;
    const today = reports.filter((r) => now - new Date(r.created_at).getTime() < day).length;
    const week = reports.filter((r) => now - new Date(r.created_at).getTime() < 7 * day).length;
    const month = reports.filter((r) => now - new Date(r.created_at).getTime() < 30 * day).length;
    return { today, week, month, total: reports.length };
  }, [reports]);

  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach((r) => {
      const t = r.type ?? "Other";
      map.set(t, (map.get(t) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const dailyData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const key = d.toISOString().slice(5, 10);
      buckets.set(key, 0);
    }
    reports.forEach((r) => {
      const d = new Date(r.created_at);
      if (Date.now() - d.getTime() > 30 * 86_400_000) return;
      const key = d.toISOString().slice(5, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  }, [reports]);

  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach((r) => {
      if (!r.city) return;
      map.set(r.city, (map.get(r.city) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [reports]);

  const hourData = useMemo(() => {
    const arr = new Array(24).fill(0);
    reports.forEach((r) => {
      arr[new Date(r.created_at).getHours()] += 1;
    });
    const max = Math.max(...arr, 1);
    return arr.map((count, hour) => ({ hour, count, intensity: count / max }));
  }, [reports]);

  function copySummary() {
    const text = `ScanScam India Fraud Report
Total Reports: ${stats.total}
Today: ${stats.today} · This Week: ${stats.week} · This Month: ${stats.month}
Most Active City: ${cityData[0]?.city ?? "—"}
Most Common Scam: ${typeData.sort((a, b) => b.value - a.value)[0]?.name ?? "—"}
Generated: ${new Date().toLocaleString()}`;
    navigator.clipboard.writeText(text);
    toast.success("Summary copied");
  }

  async function shareAnalytics() {
    const top = typeData.sort((a, b) => b.value - a.value)[0];
    const pct = top ? Math.round((top.value / reports.length) * 100) : 0;
    const text = `🚨 India Fraud Alert: ${stats.today} scams reported today. ${cityData[0]?.city ?? "Delhi"} is most affected. Most common: ${top?.name ?? "UPI Fraud"} (${pct}%). Stay safe with ScanScam!`;
    if (navigator.share) {
      try { await navigator.share({ title: "ScanScam Analytics", text }); } catch { /* ignore */ }
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  }

  function downloadPdf() {
    const text = `ScanScam India Fraud Report\n\nTotal: ${stats.total}\nToday: ${stats.today}\nWeek: ${stats.week}\nMonth: ${stats.month}\n\nTop Cities:\n${cityData.map((c, i) => `${i + 1}. ${c.city} — ${c.count}`).join("\n")}\n\nScam Types:\n${typeData.map((t) => `${t.name}: ${t.value}`).join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scanscam-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const secondsAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);

  return (
    <AppShell
      header={
        <ScreenHeader
          title="Fraud Analytics"
          subtitle="Live India data · updated every minute"
          right={
            <button onClick={load} className="rounded-full bg-card p-2 active:scale-95">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          }
        />
      }
    >
      <div className="space-y-5 px-4 pb-8 pt-4">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-1 font-bold text-danger">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-danger" /> LIVE
          </span>
          <span className="text-muted-foreground">Updated {secondsAgo}s ago</span>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Today" value={stats.today} accent="text-danger" />
          <StatCard label="Week" value={stats.week} accent="text-warning" />
          <StatCard label="Month" value={stats.month} accent="text-action" />
          <StatCard label="Total" value={stats.total} accent="text-safe" />
        </div>

        {/* Real-time feed */}
        {recent.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-3">
            <p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">🔴 Live feed</p>
            <ul className="space-y-1.5">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-xs">
                  <span><b className="text-danger">{r.type ?? "Scam"}</b> in {r.city ?? "India"}</span>
                  <span className="text-muted-foreground">{timeAgo(r.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pie */}
        <ChartCard title="Scam Categories This Month">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={32}
                  paddingAngle={2}
                  label={(e: any) => `${Math.round((e.percent ?? 0) * 100)}%`}
                  labelLine={false}
                >
                  {typeData.map((entry) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? "#8899aa"} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, color: "#8FA3BF" }} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Line */}
        <ChartCard title="Fraud Reports — Last 30 Days">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#8FA3BF", fontSize: 10 }} interval={4} />
                <YAxis tick={{ fill: "#8FA3BF", fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#FF2D55" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* City bars */}
        <ChartCard title="Top 10 Cities by Fraud Reports">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: 10 }}>
                <CartesianGrid stroke="#1e3a5f" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#8FA3BF", fontSize: 10 }} />
                <YAxis type="category" dataKey="city" tick={{ fill: "#F2F6FB", fontSize: 11 }} width={80} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1E3A5F40" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {cityData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${10 - i * 2}, 90%, ${55 + i * 2}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Hourly heatmap */}
        <ChartCard title="When Do Scams Happen?">
          <div className="grid grid-cols-12 gap-1">
            {hourData.map((h) => (
              <div key={h.hour} className="flex flex-col items-center gap-1">
                <div
                  className="h-8 w-full rounded"
                  style={{ background: heatColor(h.intensity) }}
                  title={`${h.hour}:00 — ${h.count}`}
                />
                <span className="text-[9px] text-muted-foreground">{h.hour}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">Hour of day · darker = more reports</p>
        </ChartCard>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <ActionBtn icon={<Download className="h-4 w-4" />} label="Report" onClick={downloadPdf} />
          <ActionBtn icon={<Copy className="h-4 w-4" />} label="Copy" onClick={copySummary} />
          <ActionBtn icon={<Share2 className="h-4 w-4" />} label="Share" onClick={shareAnalytics} />
        </div>

        {/* Bank/API */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-background p-4">
          <p className="text-base font-bold">🏦 Are you a Bank or Fintech?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Access our real-time fraud intelligence API. Starting ₹25,000/month.
          </p>
          <a
            href="mailto:hello@scanscam.in?subject=ScanScam Fraud API Inquiry"
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-action px-4 py-2.5 text-xs font-bold text-white"
          >
            📧 Contact Us
          </a>
        </div>
      </div>
    </AppShell>
  );
}

const tooltipStyle = {
  background: "#12233D",
  border: "1px solid #1E3A5F",
  borderRadius: 8,
  fontSize: 12,
  color: "#F2F6FB",
};

function heatColor(t: number) {
  if (t === 0) return "#1e3a5f";
  if (t < 0.25) return "rgba(255,149,0,0.3)";
  if (t < 0.5) return "#FF9500";
  if (t < 0.75) return "rgba(255,45,85,0.6)";
  return "#FF2D55";
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-center">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className={`text-xl font-black ${accent}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">scams</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {children}
    </section>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-bold active:scale-95"
    >
      {icon} {label}
    </button>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
