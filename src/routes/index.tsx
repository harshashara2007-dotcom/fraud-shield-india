import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { LiveTicker } from "@/components/LiveTicker";
import { ScamFeed } from "@/components/ScamFeed";
import { scamOfDay } from "@/lib/format";
import { ScanLine, CreditCard, Image as ImageIcon, Phone, Map as MapIcon, Megaphone, Bot, ShieldCheck } from "lucide-react";

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
            <span className="flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-1 text-[11px] font-bold text-danger">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-danger" />
              LIVE
            </span>
          }
        />
      }
    >
      <LiveTicker />

      <div className="space-y-6 px-4 pb-8 pt-5">
        {/* Stats card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-danger to-[#B30033] p-5 text-white shadow-lg shadow-danger/20">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">India 2024</p>
          <p className="mt-1 text-4xl font-black tracking-tight">₹22,845 Cr</p>
          <p className="mt-1 text-sm text-white/90">Lost to cyber fraud in India in 2024</p>
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


        {/* 3 secondary */}
        <div className="grid grid-cols-3 gap-2">
          <SecondaryAction to="/map" icon={MapIcon} label="Fraud Map" />
          <SecondaryAction to="/report" icon={Megaphone} label="Report" />
          <SecondaryAction to="/safebot" icon={Bot} label="SafeBot" />
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

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3 w-3" /> ScanScam · Made with ❤️ for India
        </p>
      </div>
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
