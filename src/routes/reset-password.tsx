import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Loader2, Lock, KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — ScanScam" },
      { name: "description", content: "Set a new password for your ScanScam account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase auto-parses the recovery hash and creates a temporary session.
    // Confirm we actually got one before allowing password change.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        // Wait for onAuthStateChange in case hash is still processing
        const sub = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || session) setReady(true);
        });
        return () => sub.data.subscription.unsubscribe();
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Password updated 🎉");
    // No auto-redirect / auto-login: this page may open in a separate browser
    // context (e.g. from a wrapped mobile app) where the session won't carry over.
  }

  return (
    <AppShell header={<ScreenHeader title="Set new password" subtitle="Almost there" />}>
      <div className="mx-auto max-w-md space-y-5 px-4 pb-8 pt-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-center gap-2">
            <KeyRound className="h-6 w-6 text-action" />
            <h1 className="text-xl font-bold">New password</h1>
          </div>

          {!ready && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying reset link…
            </div>
          )}

          {ready && !done && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="New password (min 8 chars)"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-3 text-sm focus:border-action focus:outline-none"
                />
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-3 text-sm focus:border-action focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-action py-3 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </button>
            </form>
          )}

          {done && (
            <div className="rounded-xl border border-safe/40 bg-safe/10 p-4 text-center">
              <div className="text-3xl">✅</div>
              <p className="mt-2 text-sm font-semibold">Password updated successfully!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Please return to the ScanScam app and log in with your new password.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
