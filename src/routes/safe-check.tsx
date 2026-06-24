import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { SafetyMeter } from "@/components/SafetyMeter";
import { scoreMessage, levelColor } from "@/lib/safe-detection";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, AlertTriangle, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/safe-check")({
  head: () => ({ meta: [{ title: "Genuine Message Check — ScanScam" }] }),
  component: SafeCheck,
});

function SafeCheck() {
  const [text, setText] = useState("");
  const [senders, setSenders] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("safe_sender_ids")
      .select("sender_id")
      .then(({ data }) => setSenders((data ?? []).map((d: any) => d.sender_id)));
  }, []);

  const result = useMemo(() => scoreMessage(text, senders), [text, senders]);
  const c = levelColor(result.level);

  return (
    <AppShell header={<ScreenHeader title="Genuine or Scam?" subtitle="Paste SMS / WhatsApp message" />}>
      <div className="space-y-4 px-4 pb-8 pt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste full message here (include sender ID like VM-SBIBNK if visible)…"
          rows={6}
          className="w-full rounded-xl border border-border bg-card p-3 text-sm placeholder:text-muted-foreground focus:border-safe focus:outline-none"
        />

        {text.trim().length > 0 && (
          <div className={`space-y-3 rounded-2xl border-2 ${c.border} ${c.bg} p-4 fade-in`}>
            <div className="flex items-center justify-between">
              <p className={`text-base font-black ${c.text}`}>
                {c.icon}{" "}
                {result.level === "GENUINE"
                  ? "THIS MESSAGE APPEARS GENUINE"
                  : result.level === "SCAM"
                    ? "LIKELY SCAM — DO NOT TRUST"
                    : result.level === "SUSPICIOUS"
                      ? "SUSPICIOUS — BE CAREFUL"
                      : "UNCERTAIN — VERIFY OFFICIALLY"}
              </p>
            </div>
            <SafetyMeter result={result} />

            <ul className="space-y-1.5">
              {result.checks.map((chk) => (
                <li key={chk.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span>{chk.passed ? "✅" : "❌"}</span>
                    <span>{chk.label}</span>
                  </span>
                  <span className={`font-mono ${chk.passed ? "text-safe" : "text-muted-foreground"}`}>
                    +{chk.points}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-start gap-2 rounded-lg bg-background/50 p-2.5 text-[11px]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <p>Even genuine messages never require you to share OTP, PIN or password.</p>
            </div>
          </div>
        )}

        {text.trim().length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="h-3 w-3" /> How to tell the difference
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Compare
                kind="safe"
                title="✅ Genuine bank message"
                items={[
                  "Sender: VM-SBIBNK",
                  "Rs.5000 debited from your account",
                  "No link to click, no OTP asked",
                  "Just information",
                ]}
              />
              <Compare
                kind="scam"
                title="🚨 Scam bank message"
                items={[
                  "Sender: unknown 10-digit number",
                  "Your account is BLOCKED!",
                  "Suspicious link, asks OTP",
                  "Creates panic",
                ]}
              />
              <Compare
                kind="safe"
                title="✅ Genuine call"
                items={[
                  "Asks if YOU called them",
                  "Gives employee ID",
                  "Never asks OTP or CVV",
                  "Says visit branch if needed",
                ]}
              />
              <Compare
                kind="scam"
                title="🚨 Scam call"
                items={[
                  "Creates urgent panic",
                  "Account will be blocked NOW",
                  "Asks OTP for verification",
                  "Threatens legal action",
                ]}
              />
            </div>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" /> Live analysis — updates as you type
        </p>
      </div>
    </AppShell>
  );
}

function Compare({ kind, title, items }: { kind: "safe" | "scam"; title: string; items: string[] }) {
  const styles =
    kind === "safe"
      ? "border-safe/40 bg-safe/5"
      : "border-danger/40 bg-danger/5";
  return (
    <div className={`rounded-xl border ${styles} p-3`}>
      <p className="mb-1.5 text-sm font-bold">{title}</p>
      <ul className="space-y-0.5 text-xs text-foreground/80">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}
