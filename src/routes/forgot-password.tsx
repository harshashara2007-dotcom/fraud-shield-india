import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Loader2, Mail, Phone, KeyRound, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — ScanScam" },
      { name: "description", content: "Reset your ScanScam password via email or phone OTP." },
    ],
  }),
  component: ForgotPasswordPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
// India phone: +91 followed by 10 digits, or 10 digits starting 6-9
const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), { message: "Enter a valid Indian phone (e.g. 9876543210)" })
  .transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"email" | "phone">("email");

  // Email flow
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Phone flow
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPw, setNewPw] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp" | "done">("phone");

  async function handleEmailReset(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setEmailSent(true);
    toast.success("Reset link sent — check your inbox 📧");
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data });
    setLoading(false);
    if (error) {
      if (/provider|disabled|not enabled/i.test(error.message)) {
        toast.error("SMS OTP not enabled yet. Please use email reset for now.");
        setTab("email");
        return;
      }
      return toast.error(error.message);
    }
    setPhone(parsed.data);
    setOtpSent(true);
    setPhoneStep("otp");
    toast.success("OTP sent to your phone 📱");
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) return toast.error("Enter the 6-digit OTP");
    if (newPw.length < 8) return toast.error("New password must be at least 8 characters");
    setLoading(true);
    const { error: verifyErr } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    if (verifyErr) {
      setLoading(false);
      return toast.error(verifyErr.message);
    }
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (pwErr) return toast.error(pwErr.message);
    setPhoneStep("done");
    toast.success("Password updated 🎉");
    setTimeout(() => navigate({ to: "/" }), 1200);
  }

  return (
    <AppShell header={<ScreenHeader title="Reset password" subtitle="We'll help you back in" />}>
      <div className="mx-auto max-w-md space-y-5 px-4 pb-8 pt-6">
        <Link to="/auth" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to sign in
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-center gap-2">
            <KeyRound className="h-6 w-6 text-action" />
            <h1 className="text-xl font-bold">Forgot password</h1>
          </div>

          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-muted/40 p-1">
            {(["email", "phone"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${
                  tab === t ? "bg-action text-white shadow" : "text-muted-foreground"
                }`}
              >
                {t === "email" ? <Mail className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                {t === "email" ? "Email" : "Phone OTP"}
              </button>
            ))}
          </div>

          {tab === "email" && !emailSent && (
            <form onSubmit={handleEmailReset} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                We'll email a secure link to reset your password.
              </p>
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
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-action py-3 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </button>
            </form>
          )}

          {tab === "email" && emailSent && (
            <div className="rounded-xl border border-safe/40 bg-safe/10 p-4 text-center">
              <div className="text-3xl">📧</div>
              <p className="mt-2 text-sm font-semibold">Check your email</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a reset link to <span className="font-mono">{email}</span>. Open it on this device.
              </p>
            </div>
          )}

          {tab === "phone" && phoneStep === "phone" && (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                We'll send a 6-digit OTP by SMS to your Indian phone number.
              </p>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-muted/30 py-3 pl-10 pr-3 text-sm focus:border-action focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-action py-3 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Send OTP
              </button>
              <p className="text-[10px] text-muted-foreground">
                * Phone OTP requires an SMS provider (Twilio/MSG91) to be enabled on your ScanScam backend. Use Email reset if it hasn't been enabled.
              </p>
            </form>
          )}

          {tab === "phone" && phoneStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter the OTP sent to <span className="font-mono">{phone}</span> and choose a new password.
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full rounded-xl border border-border bg-muted/30 py-3 px-3 text-center text-lg font-mono tracking-widest focus:border-action focus:outline-none"
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="New password (min 8 chars)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-xl border border-border bg-muted/30 py-3 px-3 text-sm focus:border-action focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-action py-3 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify & update password
              </button>
              <button
                type="button"
                onClick={() => { setPhoneStep("phone"); setOtpSent(false); setOtp(""); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Change phone number
              </button>
            </form>
          )}

          {tab === "phone" && phoneStep === "done" && (
            <div className="rounded-xl border border-safe/40 bg-safe/10 p-4 text-center">
              <div className="text-3xl">✅</div>
              <p className="mt-2 text-sm font-semibold">Password updated</p>
              <p className="mt-1 text-xs text-muted-foreground">Redirecting you home…</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
