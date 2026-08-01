import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { timeAgo, scamMeta } from "@/lib/format";
import {
  Shield, Users, Megaphone, AlertTriangle, Trash2, LogOut, RefreshCw, Loader2,
  Key, Ban, UserCheck, Download, Plus, ShieldCheck, ShieldOff, ClipboardList,
} from "lucide-react";

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
  pending_reports: number;
  flagged_reports: number;
  approved_reports: number;
};

type FullReport = {
  id: string;
  type: string;
  phone: string | null;
  upi_id: string | null;
  link: string | null;
  bank: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  amount_lost: number | null;
  status: string;
  flagged: boolean;
  report_count: number;
  review_reason: string | null;
  reporter_contact: string | null;
  created_at: string;
};


type ApiKeyRow = {
  id: string;
  email: string;
  plan: string;
  status: string;
  api_key: string;
  created_at: string;
  activated_at: string | null;
};

type UserRow = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  is_banned: boolean;
};

type BlacklistRow = {
  id?: string;
  identifier: string;
  scam_type: string | null;
  reports: number;
  last_reported: string | null;
};

type AuditRow = {
  id: string;
  admin_email: string | null;
  action: string;
  target: string | null;
  meta: any;
  created_at: string;
};

type Tab = "overview" | "reports" | "users" | "keys" | "blacklist" | "audit";

function AdminScreen() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<FullReport[]>([]);
  const [reportFilter, setReportFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [phones, setPhones] = useState<BlacklistRow[]>([]);
  const [upis, setUpis] = useState<BlacklistRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { checkAdmin(); }, []);

  async function checkAdmin() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { navigate({ to: "/auth" }); return; }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) { setIsAdmin(false); return; }
    setIsAdmin(true);
    await refreshAll();
  }

  async function refreshAll() {
    setLoading(true);
    const [statsRes, reportsRes, keysRes, usersRes, phonesRes, upisRes, auditRes] = await Promise.all([
      supabase.rpc("get_admin_stats"),
      supabase.rpc("admin_list_reports", { _limit: 100 }),
      supabase.rpc("admin_list_api_keys", { _limit: 100 }),
      supabase.rpc("admin_list_users", { _limit: 200 }),
      supabase.from("phone_blacklist").select("*").order("last_reported", { ascending: false, nullsFirst: false }).limit(100),
      supabase.from("upi_blacklist").select("*").order("last_reported", { ascending: false, nullsFirst: false }).limit(100),
      supabase.rpc("admin_list_audit", { _limit: 200 }),
    ]);
    if (statsRes.data && statsRes.data[0]) setStats(statsRes.data[0] as Stats);
    if (reportsRes.data) setReports(reportsRes.data as FullReport[]);
    if (keysRes.data) setApiKeys(keysRes.data as ApiKeyRow[]);
    if (usersRes.data) setUsers(usersRes.data as UserRow[]);
    if (phonesRes.data) setPhones(phonesRes.data.map((r: any) => ({ id: r.id, identifier: r.number, scam_type: r.scam_type, reports: r.reports, last_reported: r.last_reported })));
    if (upisRes.data) setUpis(upisRes.data.map((r: any) => ({ identifier: r.upi_id, scam_type: r.scam_type, reports: r.reports, last_reported: r.last_reported })));
    if (auditRes.data) setAudit(auditRes.data as AuditRow[]);
    setLoading(false);
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report permanently?")) return;
    const { error } = await supabase.rpc("admin_delete_report", { _id: id });
    if (error) return toast.error(error.message);
    setReports((r) => r.filter((x) => x.id !== id));
    toast.success("Report deleted");
  }

  async function moderateReport(id: string, status: "approved" | "rejected") {
    const note =
      status === "rejected" ? (prompt("Reason for rejection (optional)") ?? undefined) : undefined;
    const { error } = await supabase.rpc("admin_moderate_report", {
      _id: id,
      _status: status,
      _note: note,
    });
    if (error) return toast.error(error.message);
    setReports((r) =>
      r.map((x) =>
        x.id === id ? { ...x, status, flagged: status === "approved" ? false : x.flagged } : x,
      ),
    );
    setStats((s) =>
      s
        ? {
            ...s,
            pending_reports: Math.max(0, s.pending_reports - 1),
            approved_reports: status === "approved" ? s.approved_reports + 1 : s.approved_reports,
          }
        : s,
    );
    toast.success(status === "approved" ? "Report approved and published" : "Report rejected");
  }


  async function updateKey(id: string, status: "active" | "revoked") {
    const patch: any = { status };
    if (status === "active") patch.activated_at = new Date().toISOString();
    const { error } = await supabase.from("api_keys").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setApiKeys((k) => k.map((x) => x.id === id ? { ...x, ...patch } : x));
    toast.success(status === "active" ? "Key activated ✓" : "Key revoked");
  }

  async function promoteUser() {
    const email = prompt("Email of user to promote to admin:");
    if (!email) return;
    const { error } = await supabase.rpc("admin_promote_by_email", { _email: email.trim() });
    if (error) return toast.error(error.message);
    toast.success(`Promoted ${email}`);
    refreshAll();
  }

  async function demoteUser(u: UserRow) {
    if (!confirm(`Remove admin from ${u.email}?`)) return;
    const { error } = await supabase.rpc("admin_demote", { _user_id: u.user_id });
    if (error) return toast.error(error.message);
    toast.success("Admin removed");
    refreshAll();
  }

  async function banUser(u: UserRow) {
    const reason = prompt(`Ban ${u.email}? Optional reason:`);
    if (reason === null) return;
    const { error } = await supabase.rpc("admin_ban_by_email", { _email: u.email, _reason: reason || undefined });
    if (error) return toast.error(error.message);
    toast.success("User banned");
    refreshAll();
  }

  async function unbanUser(u: UserRow) {
    const { error } = await supabase.rpc("admin_unban", { _user_id: u.user_id });
    if (error) return toast.error(error.message);
    toast.success("User unbanned");
    refreshAll();
  }

  async function addBlacklist(kind: "phone" | "upi") {
    const val = prompt(`Add ${kind === "phone" ? "phone number" : "UPI ID"} to blacklist:`);
    if (!val) return;
    const scamType = prompt("Scam category (e.g. KYC Fraud, Lottery):") || undefined;
    if (kind === "phone") {
      const { error } = await supabase.rpc("increment_phone_report", { _number: val.trim(), _scam_type: scamType });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.rpc("increment_upi_report", { _upi_id: val.trim(), _scam_type: scamType });
      if (error) return toast.error(error.message);
    }
    toast.success("Added to blacklist");
    refreshAll();
  }

  async function removeBlacklist(kind: "phone" | "upi", identifier: string) {
    if (!confirm(`Remove ${identifier} from blacklist?`)) return;
    if (kind === "phone") {
      const { error } = await supabase.from("phone_blacklist").delete().eq("number", identifier);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("upi_blacklist").delete().eq("upi_id", identifier);
      if (error) return toast.error(error.message);
    }
    toast.success("Removed");
    refreshAll();
  }

  function exportCsv(rows: any[], filename: string) {
    if (!rows.length) return toast.error("Nothing to export");
    const keys = Object.keys(rows[0]);
    const esc = (v: any) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  if (isAdmin === null) {
    return (
      <AppShell header={<ScreenHeader title="Admin" />}>
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
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
          <p className="mt-2 text-sm text-muted-foreground">You need admin privileges to view this page.</p>
          <button onClick={() => navigate({ to: "/" })} className="mt-6 rounded-xl bg-action px-5 py-2.5 text-sm font-bold text-white">Back to home</button>
        </div>
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "reports", label: "Reports", icon: Megaphone },
    { id: "users", label: "Users", icon: Users },
    { id: "keys", label: "API Keys", icon: Key },
    { id: "blacklist", label: "Blacklist", icon: Ban },
    { id: "audit", label: "Audit", icon: ClipboardList },
  ];

  return (
    <AppShell
      header={
        <ScreenHeader
          title={<span className="flex items-center gap-2"><Shield className="h-5 w-5 text-danger" /> Admin</span>}
          subtitle="Full control panel"
          right={
            <div className="flex items-center gap-2">
              <button onClick={refreshAll} disabled={loading} className="rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground" aria-label="Refresh">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </button>
              <button onClick={signOut} className="flex items-center gap-1 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          }
        />
      }
    >
      <div className="space-y-4 px-4 pb-8 pt-4">
        {/* Tab bar */}
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto rounded-xl bg-muted/40 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                tab === t.id ? "bg-action text-white shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Reports" value={stats?.total_reports ?? 0} icon={Megaphone} color="#FF2D55" />
              <StatCard label="Last 24h" value={stats?.reports_24h ?? 0} icon={AlertTriangle} color="#FF9500" />
              <StatCard label="Users" value={stats?.total_users ?? 0} icon={Users} color="#007AFF" />
              <StatCard label="Deepfakes" value={stats?.total_deepfakes ?? 0} icon={Shield} color="#7C3AED" />
              <StatCard label="Phone blacklist" value={stats?.total_phone_blacklist ?? 0} icon={AlertTriangle} color="#00C853" />
              <StatCard label="UPI blacklist" value={stats?.total_upi_blacklist ?? 0} icon={AlertTriangle} color="#EC4899" />
            </div>

            <section className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={promoteUser} className="flex items-center justify-center gap-2 rounded-xl bg-action py-2.5 text-xs font-bold text-white active:scale-95">
                  <ShieldCheck className="h-3.5 w-3.5" /> Promote admin
                </button>
                <button onClick={() => exportCsv(reports, "scanscam-reports.csv")} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-2.5 text-xs font-bold active:scale-95">
                  <Download className="h-3.5 w-3.5" /> Export reports
                </button>
                <button onClick={() => exportCsv(users, "scanscam-users.csv")} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-2.5 text-xs font-bold active:scale-95">
                  <Download className="h-3.5 w-3.5" /> Export users
                </button>
                <button onClick={() => exportCsv(apiKeys, "scanscam-api-keys.csv")} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 py-2.5 text-xs font-bold active:scale-95">
                  <Download className="h-3.5 w-3.5" /> Export API keys
                </button>
              </div>
            </section>
          </>
        )}

        {tab === "reports" && (
          <section>
            <SectionHeader title={`Recent reports (${reports.length})`} onExport={() => exportCsv(reports, "scanscam-reports.csv")} />
            {reports.length === 0 ? <Empty>No reports yet.</Empty> : (
              <ul className="space-y-2">
                {reports.map((r) => {
                  const m = scamMeta(r.type);
                  return (
                    <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{m.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-danger">{m.label}</span>
                            {r.city && <span className="text-[11px] text-muted-foreground">📍 {r.city}{r.state ? `, ${r.state}` : ""}</span>}
                            <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                          </div>
                          {r.description && <p className="mt-1 text-sm">{r.description}</p>}
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {r.phone && <span className="rounded bg-muted/40 px-2 py-0.5 font-mono">📞 {r.phone}</span>}
                            {r.upi_id && <span className="rounded bg-muted/40 px-2 py-0.5 font-mono">💸 {r.upi_id}</span>}
                            {!!r.amount_lost && <span className="rounded bg-danger/15 px-2 py-0.5 font-bold text-danger">₹{r.amount_lost.toLocaleString("en-IN")} lost</span>}
                          </div>
                        </div>
                        <button onClick={() => deleteReport(r.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-danger/15 hover:text-danger" aria-label="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tab === "users" && (
          <section>
            <SectionHeader
              title={`Users (${users.length})`}
              onExport={() => exportCsv(users, "scanscam-users.csv")}
              extra={
                <button onClick={promoteUser} className="flex items-center gap-1 rounded-lg bg-action px-2.5 py-1.5 text-[11px] font-bold text-white">
                  <Plus className="h-3 w-3" /> Promote admin
                </button>
              }
            />
            <ul className="space-y-2">
              {users.map((u) => (
                <li key={u.user_id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.email}</span>
                    {u.is_admin && <span className="rounded-full bg-action/15 px-2 py-0.5 text-[10px] font-bold text-action">ADMIN</span>}
                    {u.is_banned && <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">BANNED</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Joined {timeAgo(u.created_at)}
                    {u.last_sign_in_at ? ` · last seen ${timeAgo(u.last_sign_in_at)}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.is_admin ? (
                      <button onClick={() => demoteUser(u)} className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[11px] font-semibold">
                        <ShieldOff className="h-3 w-3" /> Remove admin
                      </button>
                    ) : (
                      <button onClick={promoteUser} className="flex items-center gap-1 rounded-lg border border-action/40 bg-action/10 px-2 py-1 text-[11px] font-semibold text-action">
                        <ShieldCheck className="h-3 w-3" /> Make admin
                      </button>
                    )}
                    {u.is_banned ? (
                      <button onClick={() => unbanUser(u)} className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[11px] font-semibold">
                        <UserCheck className="h-3 w-3" /> Unban
                      </button>
                    ) : (
                      <button onClick={() => banUser(u)} className="flex items-center gap-1 rounded-lg border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
                        <Ban className="h-3 w-3" /> Ban
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tab === "keys" && (
          <section>
            <SectionHeader title={`API keys (${apiKeys.length})`} onExport={() => exportCsv(apiKeys, "scanscam-api-keys.csv")} />
            <ul className="space-y-2">
              {apiKeys.map((k) => (
                <li key={k.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{k.email}</span>
                    <StatusPill status={k.status} />
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">{k.api_key}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Plan: {k.plan} · {timeAgo(k.created_at)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {k.status !== "active" && (
                      <button onClick={() => updateKey(k.id, "active")} className="flex items-center gap-1 rounded-lg border border-safe/40 bg-safe/10 px-2 py-1 text-[11px] font-semibold text-safe">
                        <ShieldCheck className="h-3 w-3" /> Activate
                      </button>
                    )}
                    {k.status !== "revoked" && (
                      <button onClick={() => updateKey(k.id, "revoked")} className="flex items-center gap-1 rounded-lg border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
                        <Ban className="h-3 w-3" /> Revoke
                      </button>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(k.api_key); toast.success("Key copied"); }} className="rounded-lg border border-border bg-muted/30 px-2 py-1 text-[11px] font-semibold">
                      Copy key
                    </button>
                  </div>
                </li>
              ))}
              {apiKeys.length === 0 && <Empty>No API keys yet.</Empty>}
            </ul>
          </section>
        )}

        {tab === "blacklist" && (
          <section className="space-y-5">
            <div>
              <SectionHeader
                title={`Phone blacklist (${phones.length})`}
                onExport={() => exportCsv(phones, "scanscam-phone-blacklist.csv")}
                extra={
                  <button onClick={() => addBlacklist("phone")} className="flex items-center gap-1 rounded-lg bg-danger px-2.5 py-1.5 text-[11px] font-bold text-white">
                    <Plus className="h-3 w-3" /> Add phone
                  </button>
                }
              />
              <ul className="space-y-1.5">
                {phones.map((p) => (
                  <li key={p.identifier} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                    <span className="flex-1 truncate font-mono text-xs">📞 {p.identifier}</span>
                    <span className="text-[10px] text-muted-foreground">{p.reports} reports</span>
                    <button onClick={() => removeBlacklist("phone", p.identifier)} className="rounded p-1 text-muted-foreground hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {phones.length === 0 && <Empty>Empty.</Empty>}
              </ul>
            </div>
            <div>
              <SectionHeader
                title={`UPI blacklist (${upis.length})`}
                onExport={() => exportCsv(upis, "scanscam-upi-blacklist.csv")}
                extra={
                  <button onClick={() => addBlacklist("upi")} className="flex items-center gap-1 rounded-lg bg-danger px-2.5 py-1.5 text-[11px] font-bold text-white">
                    <Plus className="h-3 w-3" /> Add UPI
                  </button>
                }
              />
              <ul className="space-y-1.5">
                {upis.map((u) => (
                  <li key={u.identifier} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                    <span className="flex-1 truncate font-mono text-xs">💸 {u.identifier}</span>
                    <span className="text-[10px] text-muted-foreground">{u.reports} reports</span>
                    <button onClick={() => removeBlacklist("upi", u.identifier)} className="rounded p-1 text-muted-foreground hover:text-danger">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
                {upis.length === 0 && <Empty>Empty.</Empty>}
              </ul>
            </div>
          </section>
        )}

        {tab === "audit" && (
          <section>
            <SectionHeader title={`Audit log (${audit.length})`} onExport={() => exportCsv(audit, "scanscam-audit.csv")} />
            {audit.length === 0 ? <Empty>No admin actions recorded yet.</Empty> : (
              <ul className="space-y-2">
                {audit.map((a) => (
                  <li key={a.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-action/15 px-2 py-0.5 text-[11px] font-bold text-action">{a.action}</span>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(a.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs">
                      <span className="font-semibold">{a.admin_email ?? "unknown"}</span>
                      {a.target && <> → <span className="font-mono text-muted-foreground">{a.target}</span></>}
                    </p>
                    {a.meta && Object.keys(a.meta).length > 0 && (
                      <pre className="mt-1 overflow-x-auto rounded bg-muted/30 p-2 text-[10px] text-muted-foreground">{JSON.stringify(a.meta)}</pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string; }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <p className="mt-1 text-3xl font-black tracking-tight" style={{ color }}>{value.toLocaleString("en-IN")}</p>
    </div>
  );
}

function SectionHeader({ title, onExport, extra }: { title: string; onExport?: () => void; extra?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="flex items-center gap-1.5">
        {extra}
        {onExport && (
          <button onClick={onExport} className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 px-2 py-1 text-[11px] font-semibold">
            <Download className="h-3 w-3" /> CSV
          </button>
        )}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">{children}</p>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    active: { color: "text-safe", bg: "bg-safe/15" },
    revoked: { color: "text-danger", bg: "bg-danger/15" },
    pending_verification: { color: "text-warning", bg: "bg-warning/15" },
  };
  const m = map[status] ?? { color: "text-muted-foreground", bg: "bg-muted/40" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${m.color} ${m.bg}`}>{status.replace("_", " ")}</span>;
}
