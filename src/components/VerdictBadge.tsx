import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

export type Verdict = "SAFE" | "SUSPICIOUS" | "DANGER" | "SCAM";

const META: Record<Verdict, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  SAFE: { color: "text-safe", bg: "bg-safe/15", icon: CheckCircle2, label: "SAFE" },
  SUSPICIOUS: { color: "text-warning", bg: "bg-warning/15", icon: AlertTriangle, label: "SUSPICIOUS" },
  DANGER: { color: "text-danger", bg: "bg-danger/15", icon: ShieldAlert, label: "DANGER" },
  SCAM: { color: "text-danger", bg: "bg-danger/15", icon: ShieldAlert, label: "SCAM" },
};

export function VerdictBadge({ verdict, children }: { verdict: Verdict; children?: ReactNode }) {
  const m = META[verdict] ?? META.SUSPICIOUS;
  const Icon = m.icon;
  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${m.bg} ${m.color}`}>
      <Icon className="h-4 w-4" />
      {m.label}
      {children}
    </div>
  );
}

export function VerdictHero({ verdict, sub }: { verdict: Verdict; sub?: string }) {
  const m = META[verdict] ?? META.SUSPICIOUS;
  const Icon = m.icon;
  return (
    <div className={`flex flex-col items-center gap-3 rounded-2xl p-6 text-center ${m.bg}`}>
      <Icon className={`h-16 w-16 ${m.color}`} strokeWidth={2.2} />
      <div className={`text-4xl font-black tracking-tight ${m.color}`}>{m.label}</div>
      {sub && <p className="text-sm text-foreground/80">{sub}</p>}
    </div>
  );
}

export function TrustScore({ score }: { score: number }) {
  const s = Math.max(0, Math.min(10, score));
  const pct = (s / 10) * 100;
  const color = s >= 7 ? "bg-safe" : s >= 4 ? "bg-warning" : "bg-danger";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Trust score</span>
        <span className="font-semibold text-foreground">{s}/10</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
