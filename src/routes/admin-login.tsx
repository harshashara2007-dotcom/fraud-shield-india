import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Loader2, Mail, Lock, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin Login — ScanScam" },
      { name: "description", content: "Restricted admin console access." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLogin,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (role) {
          navigate({ to: "/admin" });
          return;
        }
      }
      setChecking(false);
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    const pw = passwordSchema.safeParse(password);
    if (!em.success) return toast.error(em.error.issues[0].message);
    if (!pw.success) return toast.error(pw.error.issues[0].message);

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: em.data,
        password: pw.data,
      });
      if (error || !data.user) {
        toast.error("Invalid credentials");
        return;
      }

      // Verify admin role — otherwise sign out immediately.
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!role) {
        await supabase.auth.signOut();
        toast.error("This account is not authorized as admin");
        return;
      }

      toast.success("Welcome, admin");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error("Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <AppShell header={<ScreenHeader title="Admin" />}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<ScreenHeader title="Admin Login" subtitle="Restricted access" />}>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-sm rounded-2xl border-2 border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/10 to-transparent p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7C3AED]/20">
              <ShieldAlert className="h-6 w-6 text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-sm font-bold">Authorized personnel only</p>
              <p className="text-[11px] text-muted-foreground">
                Non-admin accounts will be rejected.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Mail className="h-3 w-3" /> Admin email
              </span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
                placeholder="admin@scanscam.in"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Lock className="h-3 w-3" /> Password
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-[#7C3AED]"
                placeholder="••••••••"
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-3 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              {loading ? "Verifying…" : "Enter admin console"}
            </button>
          </form>

          <p className="mt-4 text-center text-[10px] text-muted-foreground">
            Not an admin?{" "}
            <Link to="/auth" className="text-action">
              Regular sign in →
            </Link>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
