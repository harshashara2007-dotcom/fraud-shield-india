import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { analyzeCall } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Search, Loader2, Megaphone, Ban, Share2, CheckCircle2, ShieldAlert } from "lucide-react";
import { addScanHistory } from "@/lib/scan-history";

export const Route = createFileRoute("/call")({
  head: () => ({ meta: [{ title: "Call Guard — ScanScam" }] }),
  component: CallScreen,
});

const SAFE_NUMBERS: Record<string, string> = {
  "18001122011": "SBI Bank Helpline",
  "18002026161": "HDFC Bank Helpline",
  "18002003344": "ICICI Bank Helpline",
  "18002095577": "Axis Bank Helpline",
  "18002260022": "Kotak Bank Helpline",
  "14646": "IRCTC Railway",
  "139": "Railway Enquiry",
  "100": "Police Emergency",
  "108": "Ambulance",
  "101": "Fire Brigade",
  "1930": "Cyber Crime Helpline",
  "1800113388": "UIDAI Aadhaar",
  "1800180111": "Income Tax Helpline",
};

function getOperator(number: string): string {
  const c = number.replace(/\D/g, "");
  if (/^(9415|9450|9451|9452|9453|9454|9455|94500|70550)/.test(c)) return "BSNL";
  if (/^(70000|70001|70002|89000|89001|96001|7|8900)/.test(c)) return "Jio";
  if (/^(98200|98201|99300|99301|70821|9|8[5-9])/.test(c)) return "Airtel";
  if (/^(98190|98191|98920|99670|70456)/.test(c)) return "Vi";
  return "Unknown Operator";
}

type AiResult = {
  callerName?: string;
  callerType?: string;
  spamScore?: number;
  verdict?: "SAFE" | "SUSPICIOUS" | "DANGER";
  spamCategory?: string;
  recommendation?: string;
  warningMessage?: string;
};

type Recent = { number: string; type: string | null; reports: number };

function CallScreen() {
  const [num, setNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [safeInfo, setSafeInfo] = useState<{ name: string; number: string } | null>(null);
  const [dangerInfo, setDangerInfo] = useState<{
    number: string;
    reports: number;
    scamType: string | null;
    location: string | null;
    operator: string;
    firstSeen: string | null;
    lastSeen: string | null;
    ai: AiResult;
    recent: { text: string; at: string }[];
  } | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const analyze = useServerFn(analyzeCall);

  useEffect(() => {
    supabase
      .from("phone_blacklist")
      .select("number,scam_type,reports")
      .order("reports", { ascending: false })
      .limit(5)
      .then(({ data }) =>
        data && setRecent(data.map((r) => ({ number: r.number, type: r.scam_type, reports: r.reports ?? 1 }))),
      );
  }, []);

  async function check() {
    const digits = num.replace(/\D/g, "");
    if (digits.length < 3) return toast.error("Enter a valid number");

    setLoading(true);
    setSafeInfo(null);
    setDangerInfo(null);

    try {
      // 1. Safe number directory
      const safeMatch = SAFE_NUMBERS[digits];
      if (safeMatch) {
        setSafeInfo({ name: safeMatch, number: digits });
        addScanHistory({ kind: "Call", verdict: "SAFE", label: `${safeMatch} (${digits})` });
        return;
      }

      const n = digits.slice(-10);
      if (n.length < 10) {
        toast.error("Enter a 10-digit number");
        return;
      }

      // 2. Blacklist
      const { data: bl } = await supabase
        .from("phone_blacklist")
        .select("reports,scam_type,operator,location,last_reported")
        .eq("number", n)
        .maybeSingle();

      // 3. Recent reports
      const { data: recentReports } = await supabase
        .from("scam_reports")
        .select("description,created_at,type")
        .eq("phone", n)
        .order("created_at", { ascending: false })
        .limit(5);

      // 4. AI
      let ai: AiResult = {};
      try {
        ai = (await analyze({ data: { phone: n } })) as AiResult;
      } catch {
        /* AI optional */
      }

      const reports = bl?.reports ?? 0;
      const info = {
        number: n,
        reports,
        scamType: bl?.scam_type ?? ai.spamCategory ?? null,
        location: bl?.location ?? null,
        operator: bl?.operator ?? getOperator(n),
        firstSeen: recentReports?.[recentReports.length - 1]?.created_at ?? null,
        lastSeen: bl?.last_reported ?? recentReports?.[0]?.created_at ?? null,
        ai,
        recent: (recentReports ?? []).map((r) => ({
          text: r.description ?? r.type ?? "Reported",
          at: r.created_at,
        })),
      };

      setDangerInfo(info);
      const verdict: "DANGER" | "SUSPICIOUS" | "SAFE" =
        reports >= 5 || ai.verdict === "DANGER"
          ? "DANGER"
          : reports > 0 || ai.verdict === "SUSPICIOUS"
          ? "SUSPICIOUS"
          : "SAFE";
      addScanHistory({ kind: "Call", verdict, label: `+91 ${n}` });
      if (verdict === "DANGER") navigator.vibrate?.([200, 100, 200]);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not check number");
    } finally {
      setLoading(false);
    }
  }

  async function reportNumber() {
    if (!dangerInfo) return;
    const n = dangerInfo.number;
    await supabase.from("scam_reports").insert({
      type: "Phone",
      phone: n,
      description: dangerInfo.ai.warningMessage ?? "Reported via Call Guard",
    });
    const { data: existing } = await supabase
      .from("phone_blacklist")
      .select("id,reports")
      .eq("number", n)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("phone_blacklist")
        .update({ reports: (existing.reports ?? 0) + 1, last_reported: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("phone_blacklist").insert({
        number: n,
        scam_type: dangerInfo.ai.spamCategory ?? "Phone",
        operator: dangerInfo.operator,
        location: dangerInfo.location,
      });
    }
    toast.success("Reported. Thank you 🛡️");
  }

  function blockNumber() {
    if (!dangerInfo) return;
    const list: string[] = JSON.parse(localStorage.getItem("blocked_numbers") || "[]");
    if (!list.includes(dangerInfo.number)) {
      list.push(dangerInfo.number);
      localStorage.setItem("blocked_numbers", JSON.stringify(list));
      toast.success("Number blocked");
    } else toast.info("Already blocked");
  }

  function shareWarning() {
    if (!dangerInfo) return;
    const text = `⚠️ SCAM ALERT: +91 ${dangerInfo.number} reported ${dangerInfo.reports} times for ${
      dangerInfo.scamType ?? "fraud"
    }. Verified by ScanScam community. Stay safe! Check numbers free: scanscam.in`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <AppShell header={<ScreenHeader title="Call Guard" subtitle="Smart caller ID for India" />}>
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

        {safeInfo && (
          <div className="space-y-3 rounded-2xl border-2 border-safe bg-safe/10 p-4 fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-safe" />
              <p className="text-sm font-black text-safe">✅ VERIFIED SAFE NUMBER</p>
            </div>
            <div>
              <p className="text-lg font-black">🏦 {safeInfo.name}</p>
              <p className="text-xs text-muted-foreground">Official Government / Bank Helpline</p>
              <p className="mt-1 font-mono text-sm">{safeInfo.number}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Trust Score</p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-safe" style={{ width: "100%" }} />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-safe">100%</p>
            </div>
            <p className="rounded-lg bg-background/40 p-3 text-xs">
              This is an official helpline — safe to answer and talk to them.
            </p>
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">
              ℹ️ Real banks never ask for OTP or PIN on call.
            </p>
          </div>
        )}

        {dangerInfo && (
          <DangerCard
            info={dangerInfo}
            onReport={reportNumber}
            onBlock={blockNumber}
            onShare={shareWarning}
          />
        )}

        <BlockedList />

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Phone className="mr-1 inline h-3 w-3" /> Most reported numbers
          </h2>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reported numbers yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {recent.map((r) => (
                <li
                  key={r.number}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-mono">+91 {r.number}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">{r.type ?? "—"}</span>
                    <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-bold text-danger">
                      {r.reports}
                    </span>
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

function DangerCard({
  info,
  onReport,
  onBlock,
  onShare,
}: {
  info: NonNullable<ReturnType<typeof useDummy>>;
  onReport: () => void;
  onBlock: () => void;
  onShare: () => void;
}) {
  const score = Math.min(
    100,
    (info.reports || 0) * 4 + (info.ai.spamScore ?? 0),
  );
  const verdict: "SAFE" | "SUSPICIOUS" | "DANGER" =
    score >= 60 || info.reports >= 5
      ? "DANGER"
      : score >= 25 || info.reports > 0
      ? "SUSPICIOUS"
      : "SAFE";
  const verdictColor =
    verdict === "DANGER" ? "#FF2D55" : verdict === "SUSPICIOUS" ? "#FF9500" : "#00C853";
  const verdictLabel =
    verdict === "DANGER" ? "SCAMMER LIKELY" : verdict === "SUSPICIOUS" ? "SUSPICIOUS" : "LIKELY OK";

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 fade-in">
      <p className="font-mono text-lg font-bold">📱 +91 {info.number}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2 py-1 text-[11px] font-black uppercase text-white"
          style={{ background: verdictColor }}
        >
          {verdictLabel}
        </span>
        {info.reports >= 10 && (
          <span className="rounded-md bg-danger px-2 py-1 text-[10px] font-black uppercase text-white">
            CONFIRMED SPAM
          </span>
        )}
      </div>

      <div>
        <p className="font-bold">{info.ai.callerName ?? (verdict === "SAFE" ? "Unknown Caller" : "Suspected Scammer")}</p>
        <p className="text-xs text-muted-foreground">
          {info.ai.callerType ?? "Individual"} • {info.operator} • {info.location ?? "India"}
        </p>
      </div>

      <div>
        <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Spam Risk</p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, background: verdictColor }}
          />
        </div>
        <p className="mt-1 text-right text-xs font-bold" style={{ color: verdictColor }}>
          {score}%
        </p>
      </div>

      {info.ai.warningMessage && (
        <p
          className="flex items-center gap-2 rounded-lg p-3 text-sm"
          style={{ background: verdictColor + "22", color: verdictColor }}
        >
          <ShieldAlert className="h-4 w-4 shrink-0" /> {info.ai.warningMessage}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <StatCell label="Reports" value={`👥 ${info.reports}`} />
        <StatCell label="Scam type" value={info.scamType ?? "Unknown"} />
        <StatCell
          label="First seen"
          value={info.firstSeen ? `📅 ${new Date(info.firstSeen).toLocaleDateString("en-IN")}` : "—"}
        />
        <StatCell
          label="Last report"
          value={info.lastSeen ? `🕐 ${new Date(info.lastSeen).toLocaleDateString("en-IN")}` : "—"}
        />
      </div>

      {info.recent.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">Recent community reports</p>
          <ul className="space-y-1">
            {info.recent.slice(0, 3).map((r, i) => (
              <li key={i} className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
                "{r.text}" — {new Date(r.at).toLocaleDateString("en-IN")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onReport}
          className="flex flex-col items-center gap-1 rounded-xl border border-danger bg-danger/10 py-2.5 text-[11px] font-bold text-danger active:scale-[0.98]"
        >
          <Megaphone className="h-4 w-4" /> Report
        </button>
        <button
          onClick={onBlock}
          className="flex flex-col items-center gap-1 rounded-xl border border-border bg-muted/40 py-2.5 text-[11px] font-bold active:scale-[0.98]"
        >
          <Ban className="h-4 w-4" /> Block
        </button>
        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 rounded-xl border border-action bg-action/10 py-2.5 text-[11px] font-bold text-action active:scale-[0.98]"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </div>
  );
}

// helper for type-inferring the danger card without exporting the shape
function useDummy() {
  return null as null | {
    number: string;
    reports: number;
    scamType: string | null;
    location: string | null;
    operator: string;
    firstSeen: string | null;
    lastSeen: string | null;
    ai: AiResult;
    recent: { text: string; at: string }[];
  };
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function BlockedList() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    try {
      setList(JSON.parse(localStorage.getItem("blocked_numbers") || "[]"));
    } catch {
      /* ignore */
    }
  }, []);
  function unblock(n: string) {
    const next = list.filter((x) => x !== n);
    setList(next);
    localStorage.setItem("blocked_numbers", JSON.stringify(next));
  }
  if (list.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        🚫 Your Blocked Numbers ({list.length})
      </h3>
      <ul className="space-y-1.5">
        {list.map((n) => (
          <li
            key={n}
            className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2 text-sm"
          >
            <span className="font-mono">+91 {n}</span>
            <button onClick={() => unblock(n)} className="text-[11px] font-bold text-action">
              Unblock
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
