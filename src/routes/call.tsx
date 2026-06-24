import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { VerdictBadge, TrustScore } from "@/components/VerdictBadge";
import { analyzeCall } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Search, Loader2, Megaphone, Volume2, CheckCircle2 } from "lucide-react";
import { isTollFreePattern, isCorporateLandline } from "@/lib/safe-detection";

export const Route = createFileRoute("/call")({
  head: () => ({ meta: [{ title: "Call Guard — ScanScam" }] }),
  component: CallScreen,
});

type Result = {
  verdict: "SAFE" | "SUSPICIOUS" | "DANGER";
  type?: string;
  operator?: string;
  location?: string;
  aiVoice?: boolean;
  trustScore?: number;
  warning?: string;
  reports?: number;
};

type Recent = { number: string; type: string | null; reports: number };
type SafeMatch = { company_name: string; category: string; helpline_number: string } | null;

function CallScreen() {
  const [num, setNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [safeMatch, setSafeMatch] = useState<SafeMatch>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const analyze = useServerFn(analyzeCall);

  useEffect(() => {
    supabase
      .from("phone_blacklist")
      .select("number,scam_type,reports")
      .order("reports", { ascending: false })
      .limit(5)
      .then(({ data }) => data && setRecent(data.map((r) => ({ number: r.number, type: r.scam_type, reports: r.reports ?? 1 }))));
  }, []);

  async function check() {
    const digits = num.replace(/\D/g, "");
    if (digits.length < 3) return toast.error("Enter a valid number");
    setLoading(true);
    setResult(null);
    setSafeMatch(null);
    try {
      // 1. Verified safe directory check (exact digits match)
      const { data: safe } = await supabase
        .from("safe_numbers")
        .select("company_name,category,helpline_number")
        .eq("helpline_number", digits)
        .maybeSingle();
      if (safe) {
        setSafeMatch(safe as SafeMatch);
        return;
      }
      // 2. Pattern-based safe detection (toll free / corporate landline)
      if (isTollFreePattern(digits) || isCorporateLandline(digits)) {
        setSafeMatch({
          company_name: isTollFreePattern(digits) ? "Toll-free / Helpline" : "Corporate landline",
          category: "Pattern",
          helpline_number: digits,
        });
        return;
      }

      const n = digits.slice(-10);
      if (n.length < 10) return toast.error("Enter a 10-digit number");
      const { data: bl } = await supabase
        .from("phone_blacklist")
        .select("reports,scam_type,operator,location")
        .eq("number", n)
        .maybeSingle();
      const ai = (await analyze({ data: { phone: n } })) as Result;
      const merged: Result = {
        ...ai,
        reports: bl?.reports ?? 0,
        operator: bl?.operator ?? ai.operator,
        location: bl?.location ?? ai.location,
        type: bl?.scam_type ?? ai.type,
      };
      if ((bl?.reports ?? 0) > 0 && merged.verdict === "SAFE") merged.verdict = "SUSPICIOUS";
      setResult(merged);
      if (merged.verdict === "DANGER") navigator.vibrate?.([200, 100, 200]);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not check number");
    } finally {
      setLoading(false);
    }
  }

  async function reportNumber() {
    const n = num.replace(/\D/g, "").slice(-10);
    if (n.length < 10) return;
    await supabase.from("scam_reports").insert({
      type: "Phone",
      phone: n,
      description: result?.warning ?? "Reported via Call Guard",
    });
    const { data: existing } = await supabase.from("phone_blacklist").select("id,reports").eq("number", n).maybeSingle();
    if (existing) {
      await supabase
        .from("phone_blacklist")
        .update({ reports: (existing.reports ?? 0) + 1, last_reported: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("phone_blacklist").insert({
        number: n,
        scam_type: result?.type ?? "Phone",
        operator: result?.operator,
        location: result?.location,
      });
    }
    toast.success("Reported. Thank you 🛡️");
  }

  return (
    <AppShell header={<ScreenHeader title="Call Guard" subtitle="Identify scam calls instantly" />}>
      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="flex items-stretch gap-2">
          <span className="flex items-center rounded-xl border border-border bg-muted px-3 text-sm font-bold">+91</span>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="98765 43210"
            value={num}
            onChange={(e) => setNum(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3.5 text-base font-medium placeholder:text-muted-foreground focus:border-safe focus:outline-none"
          />
        </div>
        <button
          onClick={check}
          disabled={loading || !num}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-safe py-3.5 text-sm font-bold text-white disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          {loading ? "Checking…" : "Check number"}
        </button>

        {safeMatch && (
          <div className="space-y-2 rounded-2xl border-2 border-safe bg-safe/10 p-4 fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-safe" />
              <p className="text-sm font-black text-safe">✅ VERIFIED SAFE NUMBER</p>
            </div>
            <p className="text-base font-bold">{safeMatch.company_name}</p>
            <p className="font-mono text-sm">{safeMatch.helpline_number}</p>
            <p className="text-xs text-foreground/80">
              This is an official {safeMatch.category.toLowerCase()} helpline. Safe to talk to them.
            </p>
            <p className="rounded-lg bg-background/40 p-2 text-[11px] text-muted-foreground">
              Reminder: even official agents will never ask for your OTP, PIN or CVV.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 fade-in">
            <div className="flex items-center justify-between">
              <VerdictBadge verdict={result.verdict} />
              {result.aiVoice && (
                <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2 py-1 text-[11px] font-bold text-warning">
                  <Volume2 className="h-3 w-3" /> AI voice
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Cell label="Operator" value={result.operator ?? "—"} />
              <Cell label="Location" value={result.location ?? "—"} />
              <Cell label="Reports" value={String(result.reports ?? 0)} />
              <Cell label="Type" value={result.type ?? "—"} />
            </div>
            {typeof result.trustScore === "number" && <TrustScore score={result.trustScore} />}
            {result.warning && <p className="rounded-lg bg-muted/40 p-3 text-sm">{result.warning}</p>}
            <button
              onClick={reportNumber}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-danger py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              <Megaphone className="h-4 w-4" /> Report this number
            </button>
          </div>
        )}

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Phone className="mr-1 inline h-3 w-3" /> Most reported numbers
          </h2>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reported numbers yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {recent.map((r) => (
                <li key={r.number} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <span className="font-mono">+91 {r.number}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{r.type ?? "—"}</span>
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-danger">{r.reports}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
