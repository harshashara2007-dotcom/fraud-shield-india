import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { timeAgo, scamMeta } from "@/lib/format";
import { Shield, Users, Megaphone, AlertTriangle, Trash2, LogOut, RefreshCw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — ScanScam" }] }),
  component: AdminScreen,
});

type Stats = {
  total_reports: number;
  total_deepfakes: number;
  total_phone_blacklist: number;
  total_upi_blacklist: number;
  total_users: number;
  reports_24h: number;
};

type FullReport = {
  id: string;
  type: string;
  phone: string | null;
  upi_id: string | null;
  link: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  amount_lost: number | null;
  created_at: string;
};

function AdminScreen() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<FullReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      navigate({ to: "/auth" });
      return;
    }
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !data) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(true);
    await refresh();
  }

  async function refresh() {
    setLoading(true);
    const [statsRes, reportsRes] = await Promise.all([
      supabase.rpc("get_admin_stats"),
      supabase.rpc("admin_list_reports", { _limit: 100 }),
    ]);
    if (statsRes.data && statsRes.data[0]) setStats(statsRes.data[0] as Stats);
    if (reportsRes.data) setReports(reportsRes.data as FullReport[]);
    if (statsRes.error) toast.error(statsRes.error.message);
    setLoading(false);
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    const { error } = await supabase.from("scam_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Report deleted");
    setReports((r) => r.filter((x) => x.id !== id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (isAdmin === null) {
    return (
      <AppShell header={<ScreenHeader title="Admin" />}>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell header={<ScreenHeader title="Admin" />}>
        <div className="mx-auto max-w-md px-4 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/15">
            <AlertTriangle className="h-8 w-8 text-danger" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Access denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You need admin privileges to view this page.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 rounded-xl bg-action px-5 py-2.5 text-sm font-bold text-white"
          >
            Back to home
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      header={
        <ScreenHeader
          title={
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-danger" />
              Admin Dashboard
            </span>
          }
          subtitle="Monitor ScanScam activity"
          right={
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                aria-label="Refresh"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
              <button
                onClick={signOut}
                className="flex items-center gap-1 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          }
        />
      }
    >
      <div className="space-y-5 px-4 pb-8 pt-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Reports" value={stats?.total_reports ?? 0} icon={Megaphone} color="#FF2D55" />
          <StatCard label="Last 24h" value={stats?.reports_24h ?? 0} icon={AlertTriangle} color="#FF9500" />
          <StatCard label="Users" value={stats?.total_users ?? 0} icon={Users} color="#007AFF" />
          <StatCard label="Deepfakes" value={stats?.total_deepfakes ?? 0} icon={Shield} color="#7C3AED" />
          <StatCard label="Phone blacklist" value={stats?.total_phone_blacklist ?? 0} icon={AlertTriangle} color="#00C853" />
          <StatCard label="UPI blacklist" value={stats?.total_upi_blacklist ?? 0} icon={AlertTriangle} color="#EC4899" />
        </div>

        {/* Reports table */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Recent reports ({reports.length})
            </h2>
          </div>
          {reports.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              No reports yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => {
                const m = scamMeta(r.type);
                return (
                  <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{m.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-danger">
                            {m.label}
                          </span>
                          {r.city && (
                            <span className="text-[11px] text-muted-foreground">
                              📍 {r.city}
                              {r.state ? `, ${r.state}` : ""}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                        </div>
                        {r.description && <p className="mt-1 text-sm">{r.description}</p>}
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          {r.phone && (
                            <span className="rounded bg-muted/40 px-2 py-0.5 font-mono">📞 {r.phone}</span>
                          )}
                          {r.upi_id && (
                            <span className="rounded bg-muted/40 px-2 py-0.5 font-mono">💸 {r.upi_id}</span>
                          )}
                          {r.link && (
                            <span className="max-w-full truncate rounded bg-muted/40 px-2 py-0.5 font-mono">
                              🔗 {r.link}
                            </span>
                          )}
                          {!!r.amount_lost && (
                            <span className="rounded bg-danger/15 px-2 py-0.5 font-bold text-danger">
                              ₹{r.amount_lost.toLocaleString("en-IN")} lost
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteReport(r.id)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-danger/15 hover:text-danger"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="mt-1 text-3xl font-black tracking-tight" style={{ color }}>
        {value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}
