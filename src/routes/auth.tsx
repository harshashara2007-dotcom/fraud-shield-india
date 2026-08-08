import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Loader2, Mail, Lock, Shield } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ScanScam" },
      { name: "description", content: "Sign in or create a free ScanScam account to protect yourself from cyber fraud." },
    ],
  }),
  component: AuthScreen,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password too long");

function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) return toast.error(parsedEmail.error.issues[0].message);
    const parsedPw = passwordSchema.safeParse(password);
    if (!parsedPw.success) return toast.error(parsedPw.error.issues[0].message);

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsedEmail.data,
          password: parsedPw.data,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in 🎉");
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: parsedEmail.data,
          password: parsedPw.data,
        });
        if (error) throw error;
        if (signInData.user) {
          // Own-ban lookup goes through RLS ("Users can see own ban"), so no
          // privileged function is needed to check another user's ban state.
          const { data: banned } = await supabase
            .from("banned_users")
            .select("user_id")
            .eq("user_id", signInData.user.id)
            .maybeSingle();
          if (banned) {
            await supabase.auth.signOut();
            toast.error("Your account has been suspended by an admin.");
            setLoading(false);
            return;
          }
        }

        toast.success("Welcome back 👋");
      }
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);

    // Inside the Median native app the browser redirect flow fails state
    // verification, so use Median's native Google plugin + ID token sign-in.
    if (isMedianApp() && hasMedianGoogleLogin()) {
      try {
        const idToken = await medianGoogleIdToken();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;
        toast.success("Welcome back 👋");
        navigate({ to: "/" });
      } catch (err) {
        if (err instanceof MedianLoginError) {
          if (err.cancelled) toast.info(err.message);
          else toast.error(err.message);
        } else {
          console.error("[auth] median google sign-in failed:", err);
          toast.error("Couldn't sign you in with Google. Please try again.");
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <AppShell header={<ScreenHeader title="Sign in" subtitle="Protect yourself with ScanScam" />}>
      <div className="mx-auto max-w-md space-y-5 px-4 pb-8 pt-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-danger" />
            <h1 className="text-xl font-bold">
              Scan<span className="text-primary">Scam</span>
            </h1>
          </div>

          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted/40 p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-semibold transition-all ${
                  mode === m ? "bg-action text-white shadow" : "text-muted-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white py-3 text-sm font-semibold text-gray-900 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-3 text-sm focus:border-action focus:outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-3 text-sm focus:border-action focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-danger to-[#B30033] py-3 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {mode === "signin" && (
            <div className="mt-3 text-center">
              <Link to="/forgot-password" className="text-[12px] font-semibold text-action hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            By continuing you agree to our{" "}
            <Link to="/privacy-policy" className="text-action">Privacy Policy</Link>.
          </p>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          🇮🇳 Your data stays private. We never share your reports.
        </p>
      </div>
    </AppShell>
  );
}
