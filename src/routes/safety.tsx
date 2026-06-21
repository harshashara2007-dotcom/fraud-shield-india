import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/safety")({
  head: () => ({ meta: [{ title: "Safety Score — ScanScam" }] }),
  component: SafetyScreen,
});

type Safety = { scans: number; reports: number; quiz: boolean; pwa: boolean };
const KEY = "ss_safety";

function loadSafety(): Safety {
  try { return { scans: 0, reports: 0, quiz: false, pwa: false, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; }
  catch { return { scans: 0, reports: 0, quiz: false, pwa: false }; }
}
function saveSafety(s: Safety) { localStorage.setItem(KEY, JSON.stringify(s)); }

function computeScore(s: Safety) {
  let n = 0;
  n += Math.min(30, s.scans * 5);
  n += Math.min(30, s.reports * 10);
  if (s.quiz) n += 20;
  if (s.pwa) n += 20;
  return Math.min(100, n);
}

function label(n: number) {
  if (n <= 40) return { text: "At Risk", color: "text-danger", emoji: "🔴" };
  if (n <= 70) return { text: "Getting Safer", color: "text-warning", emoji: "🟡" };
  if (n <= 90) return { text: "Well Protected", color: "text-safe", emoji: "🟢" };
  return { text: "Safety Expert", color: "text-action", emoji: "⭐" };
}

const QUIZ = [
  { q: "Your bank calls asking for OTP for KYC. What do you do?", opts: ["Share OTP — it's official", "Hang up and call the bank yourself", "Ask them to call later"], a: 1 },
  { q: "Someone sends a QR saying 'scan to receive ₹5000'. You should:", opts: ["Scan it quickly", "Forward to friends", "Refuse — QR only sends money"], a: 2 },
  { q: "A WhatsApp message says you won a Tata car lottery. You:", opts: ["Send your details to claim", "Ignore — there's no such lottery", "Forward to family"], a: 1 },
  { q: "FedEx call claims your parcel has drugs. You:", opts: ["Press 1 to talk to police", "Hang up — it's a scam", "Pay the 'fine'"], a: 1 },
  { q: "A 'job' wants ₹2000 registration fee. You:", opts: ["Pay — it's only 2k", "Refuse — real jobs never charge", "Negotiate"], a: 1 },
];

function SafetyScreen() {
  const [safety, setSafety] = useState<Safety>(() => loadSafety());
  const [quizOpen, setQuizOpen] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [family, setFamily] = useState("");

  useEffect(() => {
    if (window.matchMedia?.("(display-mode: standalone)").matches) {
      const s = { ...safety, pwa: true };
      setSafety(s); saveSafety(s);
    }
  }, []);

  const score = computeScore(safety);
  const lbl = label(score);

  function answer(i: number) {
    const isRight = i === QUIZ[qIdx].a;
    if (isRight) setCorrect((c) => c + 1);
    if (qIdx + 1 < QUIZ.length) setQIdx(qIdx + 1);
    else {
      const passed = (correct + (isRight ? 1 : 0)) >= 3;
      const s = { ...safety, quiz: passed || safety.quiz };
      setSafety(s); saveSafety(s);
      setQuizOpen(false);
      setQIdx(0); setCorrect(0);
      toast.success(passed ? "Quiz passed — +20 safety points!" : "Keep learning — try again!");
    }
  }

  function shareWithFamily() {
    const n = family.replace(/\D/g, "");
    if (n.length < 10) return toast.error("Enter a valid number");
    const text = "Hey! 👋 Stay safe from scams in India — install ScanScam to check UPI IDs, scan QR codes, and identify scam calls instantly. 🛡️";
    window.open(`https://wa.me/91${n}?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <AppShell header={<ScreenHeader title="Safety Score" subtitle="Track your fraud-protection level" />}>
      <div className="space-y-5 px-4 pb-8 pt-4">
        {/* Gauge */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="relative flex h-44 w-44 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${score <= 40 ? "#FF2D55" : score <= 70 ? "#FF9500" : "#00C853"} ${score * 3.6}deg, #1E3A5F 0deg)`,
            }}
          >
            <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-card">
              <span className="text-5xl font-black">{score}</span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
          </div>
          <p className={`text-xl font-bold ${lbl.color}`}>
            {lbl.text} {lbl.emoji}
          </p>
        </div>

        {/* Categories */}
        <section className="space-y-2">
          <CatBar label="Scam Awareness" value={Math.min(100, safety.scans * 20)} />
          <CatBar label="Reports Filed" value={Math.min(100, safety.reports * 30)} />
          <CatBar label="Quiz Completed" value={safety.quiz ? 100 : 0} />
          <CatBar label="App Installed (PWA)" value={safety.pwa ? 100 : 0} />
          <CatBar label="Recent Activity" value={Math.min(100, (safety.scans + safety.reports) * 15)} />
        </section>

        {/* Badges */}
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Badges</h2>
          <div className="grid grid-cols-3 gap-2">
            <Badge emoji="🔍" name="Scam Spotter" earned={safety.scans >= 1} />
            <Badge emoji="🛡️" name="Guardian" earned={safety.reports >= 1} />
            <Badge emoji="📢" name="First Reporter" earned={safety.reports >= 1} />
            <Badge emoji="🔒" name="Security Pro" earned={safety.quiz} />
            <Badge emoji="🏆" name="Top Protector" earned={safety.scans >= 20} />
            <Badge emoji="⭐" name="Safety Expert" earned={score >= 90} />
          </div>
        </section>

        <button
          onClick={() => setQuizOpen(true)}
          className="w-full rounded-xl bg-action py-3.5 text-sm font-bold text-white active:scale-[0.98]"
        >
          Take 5-question safety quiz (+20 pts)
        </button>

        {/* Family */}
        <section className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Protect your family</p>
          <p className="mt-1 text-sm">Send a safety tip to a family member on WhatsApp.</p>
          <div className="mt-2 flex gap-2">
            <input
              type="tel"
              placeholder="Phone (10 digits)"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm"
            />
            <button onClick={shareWithFamily} className="rounded-lg bg-safe px-3 text-xs font-bold text-white">
              Send
            </button>
          </div>
        </section>

        {/* Quiz overlay */}
        {quizOpen && (
          <div className="fixed inset-0 z-40 flex items-end bg-black/60 sm:items-center sm:justify-center" onClick={() => setQuizOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[430px] rounded-t-2xl border-t border-border bg-card p-5 sm:rounded-2xl"
            >
              <p className="text-xs text-muted-foreground">Question {qIdx + 1} of {QUIZ.length}</p>
              <h3 className="mt-1 text-base font-bold">{QUIZ[qIdx].q}</h3>
              <div className="mt-4 space-y-2">
                {QUIZ[qIdx].opts.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium hover:border-action"
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-action transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Badge({ emoji, name, earned }: { emoji: string; name: string; earned: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${earned ? "border-safe/60 bg-safe/5" : "border-border bg-card opacity-50"}`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-[11px] font-semibold leading-tight">{name}</span>
    </div>
  );
}
