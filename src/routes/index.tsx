import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { LiveTicker } from "@/components/LiveTicker";
import { ScamFeed } from "@/components/ScamFeed";
import { scamOfDay } from "@/lib/format";
import supportQr from "@/assets/support-qr.jpeg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { ScanLine, CreditCard, Image as ImageIcon, Phone, Map as MapIcon, Megaphone, Bot, ShieldCheck, BarChart3, Heart, Copy, X, LogIn, LogOut, Shield } from "lucide-react";

const SUPPORT_UPI = "reenaashara22@oksbi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScanScam — India's #1 free AI fraud detector" },
      { name: "description", content: "Spot UPI fraud, scam calls and fake KYC in seconds. Live community scam map for India." },
    ],
  }),
  component: Home,
});

function Home() {
  const sod = scamOfDay();
  const [showSupport, setShowSupport] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function load(uid: string | undefined, email: string | null) {
      setUserEmail(email);
      if (!uid) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    }
    supabase.auth.getUser().then(({ data }) => load(data.user?.id, data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user?.id, session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
  }

  return (
    <AppShell
      header={
        <ScreenHeader
          title={
            <span className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <span>
                Scan<span className="text-primary">Scam</span>
              </span>
            </span>
          }
          subtitle="AI fraud detector for India"
          right={
            <div className="flex items-center gap-1.5">
              {userEmail ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-1 rounded-full bg-[#7C3AED]/20 px-2.5 py-1 text-[11px] font-bold text-[#7C3AED]"
                    >
                      <Shield className="h-3 w-3" /> Admin
                    </Link>
                  )}
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 text-[11px] font-semibold"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-1 rounded-full bg-action px-2.5 py-1 text-[11px] font-bold text-white"
                >
                  <LogIn className="h-3 w-3" /> Sign in
                </Link>
              )}
            </div>
          }
        />
      }
    >
      <LiveTicker />

      <div className="space-y-6 px-4 pb-8 pt-5">
        {/* Stats card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-danger to-[#B30033] p-5 text-white shadow-lg shadow-danger/20">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">India 2025</p>
          <p className="mt-1 text-4xl font-black tracking-tight">₹48,021 Cr</p>
          <p className="mt-1 text-sm text-white/90">Lost to cyber fraud in India in 2025</p>
        </div>

        {/* 2x2 primary actions */}
        <div className="grid grid-cols-2 gap-3">
          <ActionCard to="/scan" icon={ScanLine} label="Scan QR" hint="Live camera" />
          <ActionCard to="/upi" icon={CreditCard} label="Check UPI" hint="Verify ID" />
          <ActionCard to="/screenshot" icon={ImageIcon} label="Analyze Screenshot" hint="AI vision" />
          <ActionCard to="/call" icon={Phone} label="Check Call" hint="Spam guard" />
        </div>

        {/* Deepfake — featured */}
        <Link
          to="/deepfake"
          className="group flex items-center gap-4 rounded-2xl border border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/20 to-[#4C1D95]/10 p-4 transition-all active:scale-[0.98] hover:border-[#7C3AED]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/20 text-2xl">🎭</div>
          <div className="flex-1">
            <p className="text-sm font-bold">Deepfake Detector</p>
            <p className="text-[11px] text-muted-foreground">Detect fake videos & AI-generated photos</p>
          </div>
          <span className="text-[#7C3AED]">→</span>
        </Link>


        {/* Safe detection — featured */}
        <Link
          to="/safe-check"
          className="group flex items-center gap-4 rounded-2xl border border-safe/40 bg-gradient-to-br from-safe/15 to-safe/5 p-4 transition-all active:scale-[0.98] hover:border-safe"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-safe/20 text-2xl">✅</div>
          <div className="flex-1">
            <p className="text-sm font-bold">Genuine or Scam?</p>
            <p className="text-[11px] text-muted-foreground">Paste a message — live safety score</p>
          </div>
          <span className="text-safe">→</span>
        </Link>

        {/* Analytics — featured */}
        <Link
          to="/analytics"
          className="group flex items-center gap-4 rounded-2xl border border-[#7C3AED]/40 bg-gradient-to-br from-[#7C3AED]/20 to-[#4C1D95]/10 p-4 transition-all active:scale-[0.98] hover:border-[#7C3AED]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]/20 text-2xl">📊</div>
          <div className="flex-1">
            <p className="text-sm font-bold">Fraud Analytics</p>
            <p className="text-[11px] text-muted-foreground">Live India data · charts & trends</p>
          </div>
          <span className="text-[#7C3AED]">→</span>
        </Link>

        {/* 4 secondary */}
        <div className="grid grid-cols-4 gap-2">
          <SecondaryAction to="/map" icon={MapIcon} label="Fraud Map" />
          <SecondaryAction to="/safe-numbers" icon={ShieldCheck} label="Safe Nos." />
          <SecondaryAction to="/report" icon={Megaphone} label="Report" />
          <SecondaryAction to="/safebot" icon={Bot} label="SafeBot" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SecondaryAction to="/analytics" icon={BarChart3} label="Analytics" />
          <SecondaryAction to="/call" icon={Phone} label="Truecaller Check" />
        </div>


        {/* Scam of the day */}
        <section className="rounded-2xl border-2 border-warning/60 bg-warning/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-warning">Scam of the day</p>
          <h3 className="mt-1 text-base font-bold">{sod.title}</h3>
          <p className="mt-1 text-sm text-foreground/80">{sod.body}</p>
        </section>

        {/* Live feed */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Live community reports</h2>
            <Link to="/map" className="text-xs font-semibold text-action">See map →</Link>
          </div>
          <ScamFeed limit={5} />
        </section>

        {/* Safety tips */}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Stay safe</h2>
          <div className="grid grid-cols-1 gap-2">
            {[
              ["🚫", "Never scan a QR to RECEIVE money — QRs only deduct."],
              ["🏦", "Your bank will never ask for OTP, PIN or CVV on a call."],
              ["✅", "Always check the UPI name before paying anyone."],
              ["🎰", "No real government lottery is sent on WhatsApp."],
            ].map(([emoji, text]) => (
              <div key={text} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                <span className="text-xl">{emoji}</span>
                <p className="text-sm">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Support ScanScam */}
        <button
          onClick={() => setShowSupport(true)}
          className="flex w-full items-center gap-4 rounded-2xl border border-danger/40 bg-gradient-to-br from-danger/15 to-[#FF6B9D]/10 p-4 transition-all active:scale-[0.98] hover:border-danger"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-danger/20 text-2xl">
            <Heart className="h-6 w-6 text-danger" fill="currentColor" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold">Support ScanScam</p>
            <p className="text-[11px] text-muted-foreground">Help keep India scam-free · Pay via UPI</p>
          </div>
          <span className="text-danger">→</span>
        </button>


        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3 w-3" /> ScanScam · Made with ❤️ for India
        </p>
        <p className="text-center text-[11px]">
          <Link to="/privacy-policy" className="text-action">Privacy Policy</Link>
          <span className="mx-2 text-muted-foreground">·</span>
          <Link to="/landing" className="text-action">For Business</Link>
        </p>
      </div>

      {showSupport && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setShowSupport(false)}
        >
          <div
            className="fade-in relative w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSupport(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/15">
                <Heart className="h-6 w-6 text-danger" fill="currentColor" />
              </div>
              <h3 className="mt-3 text-lg font-bold">Support ScanScam</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Every rupee helps us fight fraud in India 🇮🇳
              </p>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl bg-white p-4">
              <img
                src={supportQr.url}
                alt="ScanScam UPI QR Code"
                className="mx-auto block w-full max-w-[260px]"
              />
            </div>

            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                UPI ID
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold">{SUPPORT_UPI}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SUPPORT_UPI);
                    toast.success("UPI ID copied");
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-action px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
            </div>

            <a
              href={`upi://pay?pa=${encodeURIComponent(SUPPORT_UPI)}&pn=${encodeURIComponent("ScanScam India")}&cu=INR`}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-danger to-[#FF6B9D] py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              <Heart className="h-4 w-4" fill="currentColor" /> Pay with UPI app
            </a>

            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Scan the QR with any UPI app · GPay, PhonePe, Paytm, BHIM
            </p>
          </div>
        </div>
      )}
    </AppShell>

  );
}

function ActionCard({ to, icon: Icon, label, hint }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; hint: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 transition-all active:scale-95 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
    >
      <Icon className="h-7 w-7 text-primary" />
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}

function SecondaryAction({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-center transition-all active:scale-95 hover:border-action"
    >
      <Icon className="h-5 w-5 text-action" />
      <span className="text-[11px] font-semibold">{label}</span>
    </Link>
  );
}
