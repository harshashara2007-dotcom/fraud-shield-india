import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  Sun,
  Moon,
  LogOut,
  KeyRound,
  History,
  Bell,
  Trash2,
  ChevronRight,
  Coins,
  Zap,
  X,
  Sparkles,
} from "lucide-react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { loadScanHistory } from "@/lib/scan-history";
import { fetchCredits, CREDIT_PACKS } from "@/lib/credits";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile · ScanScam" },
      { name: "description", content: "Manage your ScanScam account, theme, and preferences." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [joined, setJoined] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  const [resetAt, setResetAt] = useState<string | null>(null);
  const [showBuy, setShowBuy] = useState(false);
  const [notify, setNotify] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem("scanscam-notify") !== "0";
  });

  useEffect(() => {
    setScanCount(loadScanHistory().length);
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) { setCreditsLoading(false); return; }
      setEmail(u.email ?? "");
      setUserId(u.id);
      setJoined(u.created_at ?? "");
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!role);
      try {
        const c = await fetchCredits();
        if (c) { setCredits(c.balance); setResetAt(c.monthly_reset_at); }
        else setCredits(0);
      } finally {
        setCreditsLoading(false);
      }
    });

  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("scanscam-notify", notify ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [notify]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  async function resetPassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email");
  }

  function clearHistory() {
    try {
      localStorage.removeItem("scanHistory");
      setScanCount(0);
      toast.success("Scan history cleared");
    } catch {
      toast.error("Could not clear history");
    }
  }

  const initial = (email || "U").charAt(0).toUpperCase();
  const joinedLabel = joined ? new Date(joined).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <AppShell
      header={
        <ScreenHeader
          title="Profile"
          subtitle="Your account & preferences"
          right={
            <Link to="/" className="rounded-full bg-muted/40 p-1.5" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
      }
    >
      <div className="space-y-6 px-4 pb-10 pt-5">
        {/* Identity card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-black text-primary-foreground shadow-lg shadow-primary/30">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{email || "Signed in"}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="h-3 w-3" /> Joined {joinedLabel}
              </p>
              {isAdmin && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#7C3AED]/20 px-2 py-0.5 text-[10px] font-bold text-[#7C3AED]">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatBox label="Your scans" value={String(scanCount)} />
            <StatBox label="Account" value={isAdmin ? "Admin" : "Member"} />
          </div>
        </div>

        {/* Credits */}
        <section>
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Credits</h2>
          <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#F59E0B]/15 via-card to-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F59E0B]/20">
                <Coins className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                {creditsLoading ? (
                  <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
                ) : (
                  <p className="text-2xl font-black">{credits ?? 0}</p>
                )}

                <p className="text-[11px] text-muted-foreground">
                  100 free every month · 2 credits per scan
                  {resetAt && <> · resets {new Date(resetAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>}
                </p>
              </div>
              <button onClick={() => setShowBuy(true)} className="flex items-center gap-1 rounded-xl bg-[#F59E0B] px-3 py-2 text-xs font-bold text-white active:scale-95">
                <Zap className="h-3.5 w-3.5" /> Buy
              </button>
            </div>
          </div>
        </section>


        {/* Appearance */}
        <Section title="Appearance">
          <Row
            icon={theme === "dark" ? Moon : Sun}
            label={theme === "dark" ? "Dark mode" : "Light mode"}
            hint="Switch between bright and dark theme"
          >
            <Switch checked={theme === "light"} onCheckedChange={toggle} aria-label="Toggle theme" />
          </Row>
          <Row icon={Bell} label="Scam alerts" hint="Show live community notifications">
            <Switch checked={notify} onCheckedChange={setNotify} aria-label="Toggle alerts" />
          </Row>
        </Section>

        {/* Account */}
        <Section title="Account">
          <RowLink icon={Mail} label="Email" hint={email || "—"} disabled />
          <RowButton icon={KeyRound} label="Change password" hint="Send reset link to email" onClick={resetPassword} />
          {isAdmin && <RowLinkTo icon={Shield} label="Admin dashboard" hint="Monitor scam activity" to="/admin" />}
          <RowLinkTo icon={History} label="Scan history" hint={`${scanCount} recent scans`} to="/safety" />
        </Section>

        {/* Danger zone */}
        <Section title="Data">
          <RowButton
            icon={Trash2}
            label="Clear scan history"
            hint="Removes locally saved scans"
            onClick={clearHistory}
            danger
          />
          <RowButton icon={LogOut} label="Sign out" hint="End your session" onClick={handleSignOut} danger />
        </Section>

        <p className="pt-2 text-center text-[10px] text-muted-foreground">
          User ID · <span className="font-mono">{userId ? userId.slice(0, 8) : "—"}</span>
        </p>
      </div>

      {showBuy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setShowBuy(false)}>
          <div className="fade-in relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowBuy(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted/40" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#F59E0B]" />
              <h3 className="text-lg font-bold">Top up credits</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Pay via UPI · credits added by admin after payment.</p>
            <div className="mt-4 space-y-2">
              {CREDIT_PACKS.map((p) => (
                <a
                  key={p.credits}
                  href={`upi://pay?pa=reenaashara22@oksbi&pn=${encodeURIComponent("ScanScam")}&am=${p.price}&cu=INR&tn=${encodeURIComponent(`Credits ${p.credits} for ${email}`)}`}
                  className={`flex items-center justify-between rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                    p.best ? "border-[#F59E0B] bg-[#F59E0B]/10" : "border-border bg-muted/20"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black">{p.credits} credits</p>
                      {p.best && <span className="rounded-full bg-[#F59E0B] px-2 py-0.5 text-[9px] font-bold text-white">BEST</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{p.label} pack</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">₹{p.price}</p>
                    <p className="text-[10px] font-semibold text-action">Pay via UPI →</p>
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              After paying, credits are added within 24 hours. Contact support with your UPI transaction ID.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-5 w-5 shrink-0 text-action" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function RowLink({
  icon: Icon,
  label,
  hint,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${disabled ? "opacity-90" : ""}`}>
      <Icon className="h-5 w-5 shrink-0 text-action" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function RowLinkTo({
  icon: Icon,
  label,
  hint,
  to,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  to: string;
}) {
  return (
    <Link to={to} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/30">
      <Icon className="h-5 w-5 shrink-0 text-action" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function RowButton({
  icon: Icon,
  label,
  hint,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30"
    >
      <Icon className={`h-5 w-5 shrink-0 ${danger ? "text-danger" : "text-action"}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${danger ? "text-danger" : ""}`}>{label}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
