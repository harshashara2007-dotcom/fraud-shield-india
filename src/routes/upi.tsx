import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { VerdictBadge, TrustScore } from "@/components/VerdictBadge";
import { analyzeUpi } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Search, Megaphone, Loader2 } from "lucide-react";

export const Route = createFileRoute("/upi")({
  head: () => ({ meta: [{ title: "UPI Truth Check — ScanScam" }] }),
  component: UpiScreen,
});

type Result = {
  verdict: "SAFE" | "SUSPICIOUS" | "DANGER";
  name?: string;
  bank?: string;
  city?: string;
  trustScore?: number;
  firstSeen?: string;
  reason?: string;
  reports?: number;
};

type Recent = { upi: string; verdict: string };

function UpiScreen() {
  const [upi, setUpi] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const analyze = useServerFn(analyzeUpi);

  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem("ss_recent_upi") ?? "[]");
      setRecent(r);
    } catch {}
  }, []);

  function pushRecent(item: Recent) {
    const next = [item, ...recent.filter((r) => r.upi !== item.upi)].slice(0, 5);
    setRecent(next);
    localStorage.setItem("ss_recent_upi", JSON.stringify(next));
  }

  async function verify() {
    const id = upi.trim();
    if (!id.includes("@")) {
      toast.error("Enter a valid UPI ID like name@bank");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      // 1. community check
      const { data: bl } = await supabase
        .from("upi_blacklist")
        .select("reports,scam_type,last_reported")
        .eq("upi_id", id)
        .maybeSingle();

      // 2. AI
      const ai = (await analyze({ data: { upiId: id } })) as Result;
      const merged: Result = {
        ...ai,
        reports: bl?.reports ?? 0,
        firstSeen: bl?.last_reported ? new Date(bl.last_reported).toDateString() : ai.firstSeen,
      };
      if ((bl?.reports ?? 0) > 0 && merged.verdict === "SAFE") merged.verdict = "SUSPICIOUS";
      setResult(merged);
      pushRecent({ upi: id, verdict: merged.verdict });
      if (merged.verdict === "DANGER") navigator.vibrate?.([200, 100, 200]);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not verify UPI");
    } finally {
      setLoading(false);
    }
  }

  async function reportUpi() {
    if (!upi) return;
    const id = upi.trim();
    await supabase.from("scam_reports").insert({
      type: "UPI",
      upi_id: id,
      description: result?.reason ?? "Reported via UPI check",
    });
    // upsert blacklist
    const { data: existing } = await supabase
      .from("upi_blacklist")
      .select("id,reports")
      .eq("upi_id", id)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("upi_blacklist")
        .update({ reports: (existing.reports ?? 0) + 1, last_reported: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("upi_blacklist").insert({ upi_id: id, scam_type: "UPI" });
    }
    toast.success("Reported. Community protected 🛡️");
  }

  return (
    <AppShell header={<ScreenHeader title="UPI Truth Check" subtitle="Verify any UPI ID with AI + community" />}>
      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="space-y-2">
          <input
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="Enter UPI ID (e.g. name@paytm)"
            value={upi}
            onChange={(e) => setUpi(e.target.value.toLowerCase())}
            className="w-full rounded-xl border border-border bg-card px-4 py-3.5 text-base font-medium placeholder:text-muted-foreground focus:border-action focus:outline-none"
          />
          <button
            onClick={verify}
            disabled={loading || !upi}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-action py-3.5 text-sm font-bold text-white disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            {loading ? "Verifying with AI + community…" : "Verify UPI"}
          </button>
        </div>

        {result && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 fade-in">
            <div className="flex items-center justify-between">
              <VerdictBadge verdict={result.verdict} />
              <span className="text-[11px] text-muted-foreground">{result.firstSeen ?? "—"}</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Account</p>
              <p className="text-lg font-bold">{result.name ?? "Unknown"}</p>
              <p className="text-sm text-muted-foreground">
                {result.bank ?? "—"} · {result.city ?? "—"}
              </p>
            </div>
            {typeof result.trustScore === "number" && <TrustScore score={result.trustScore} />}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-[11px] text-muted-foreground">Community reports</p>
                <p className="text-lg font-bold text-danger">{result.reports ?? 0}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="text-[11px] text-muted-foreground">AI verdict</p>
                <p className="text-sm font-bold">{result.verdict}</p>
              </div>
            </div>
            {result.reason && <p className="rounded-lg bg-muted/40 p-3 text-sm">{result.reason}</p>}
            <button
              onClick={reportUpi}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-danger py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              <Megaphone className="h-4 w-4" /> Report this UPI
            </button>
          </div>
        )}

        {recent.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent checks</h2>
            <ul className="space-y-2">
              {recent.map((r) => (
                <li
                  key={r.upi}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="truncate">{r.upi}</span>
                  <VerdictBadge verdict={r.verdict as any} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Try these test UPIs:</p>
          <div className="flex flex-wrap gap-1.5">
            {["suspicious.refund@ybl", "merchant@paytm", "lottery.prize@oksbi"].map((s) => (
              <button
                key={s}
                onClick={() => setUpi(s)}
                className="rounded-full border border-border bg-muted/40 px-2 py-0.5 hover:bg-action/15 hover:text-action"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
