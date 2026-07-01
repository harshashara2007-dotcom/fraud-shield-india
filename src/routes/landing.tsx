import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Zap, Globe2, Lock, Sparkles, RefreshCcw, Copy, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "ScanScam API — India's Most Accurate Fraud Detection API" },
      {
        name: "description",
        content:
          "Real-time UPI fraud, scam call and deepfake detection API for Indian banks, fintechs and enterprises.",
      },
      { property: "og:title", content: "ScanScam API — Fraud Detection for India" },
      {
        property: "og:description",
        content: "Bank-grade fraud detection API. UPI, phone, deepfake — under 200ms.",
      },
    ],
  }),
  component: Landing,
});

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        start = target;
        clearInterval(timer);
      }
      setVal(start);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return val;
}

function Landing() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#0A1628" }}>
      <Navbar />
      <Hero />
      <StatsSection />
      <LiveDemo />
      <HowItWorks />
      <CodeExamples />
      <Pricing />
      <WhyUs />
      <Faq />
      <ContactForm />
      <Footer />
    </div>
  );
}

function Navbar() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md"
      style={{ background: "rgba(10,22,40,0.85)", borderColor: "#1e3a5f" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <a href="#top" className="flex items-center gap-2">
          <svg viewBox="0 0 100 100" className="h-7 w-7">
            <polygon points="50,2 93,26 93,74 50,98 7,74 7,26" fill="#FF2D55" />
            <path d="M50,22 L68,32 L68,54 Q68,68 50,78 Q32,68 32,54 L32,32 Z" fill="white" />
            <text x="50" y="58" textAnchor="middle" fill="#FF2D55" fontSize="20" fontWeight="900">
              S
            </text>
          </svg>
          <span className="text-base font-black">
            Scan<span className="text-[#FF2D55]">Scam</span>
          </span>
        </a>
        <div className="hidden gap-6 text-sm font-semibold text-[#c9d4e2] md:flex">
          <Link to="/" className="hover:text-white">
            App
          </Link>
          <a href="#pricing" className="hover:text-white">
            Pricing
          </a>
          <a href="#demo" className="hover:text-white">
            API
          </a>
          <a href="#contact" className="hover:text-white">
            Contact
          </a>
        </div>
        <a
          href="#contact"
          className="rounded-lg bg-[#FF2D55] px-3 py-1.5 text-xs font-black text-white shadow shadow-[#FF2D55]/30"
        >
          Free Trial
        </a>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center px-5 pt-20"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, rgba(255,45,85,0.12), transparent 60%), linear-gradient(#0a1628 1px, transparent 1px), linear-gradient(90deg, #0a1628 1px, transparent 1px)",
        backgroundSize: "auto, 40px 40px, 40px 40px",
        backgroundColor: "#0A1628",
      }}
    >
      <div className="mx-auto max-w-4xl py-16 text-center">
        <span className="inline-block rounded-full border border-[#FF2D55]/40 bg-[#FF2D55]/10 px-3 py-1 text-[11px] font-bold text-[#FF2D55]">
          🇮🇳 Made in India • Community Powered
        </span>
        <h1 className="mt-6 text-4xl font-black leading-[1.1] md:text-6xl">
          India's Most Accurate <br />
          <span className="text-[#FF2D55]">Fraud Detection API</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-[#8899aa] md:text-lg">
          Real-time UPI fraud detection, scam call identification and deepfake detection API for banks and
          fintechs.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="#contact"
            className="rounded-xl bg-[#FF2D55] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#FF2D55]/30 transition hover:brightness-110"
          >
            🚀 Get Free API Trial
          </a>
          <a
            href="#demo"
            className="rounded-xl border border-white/30 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
          >
            📖 See Live Demo
          </a>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#8899aa]">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Bank Grade Security
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3 w-3" /> Under 200ms
          </span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="h-3 w-3" /> India Specific
          </span>
          <span className="flex items-center gap-1.5">
            <RefreshCcw className="h-3 w-3" /> Real-time
          </span>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) setActive(true);
      },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const frauds = useCountUp(5832, active);
  const cities = useCountUp(10, active, 900);
  const ms = useCountUp(200, active);
  const uptime = useCountUp(999, active); // /10 = 99.9

  const stats: [string, string, string][] = [
    [Math.floor(frauds).toLocaleString("en-IN"), "Frauds Detected", "#FF2D55"],
    [String(Math.floor(cities)), "Cities Covered", "#00C853"],
    [`${Math.floor(ms)}ms`, "Response Time", "#007AFF"],
    [`${(uptime / 10).toFixed(1)}%`, "Uptime", "#FF9500"],
  ];
  return (
    <section ref={ref} className="border-y border-[#1e3a5f] bg-[#0c1a30] px-5 py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
        {stats.map(([v, l, c]) => (
          <div key={l} className="text-center">
            <p className="text-4xl font-black md:text-5xl" style={{ color: c }}>
              {v}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-[#8899aa]">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveDemo() {
  const [tab, setTab] = useState<"upi" | "phone" | "stats">("upi");
  return (
    <section id="demo" className="px-5 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-wider text-[#FF2D55]">Live Demo</p>
        <h2 className="mt-2 text-3xl font-black md:text-4xl">Try Our API Right Now</h2>
        <p className="mt-2 text-sm text-[#8899aa]">No API key needed for demo.</p>

        <div className="mt-8 rounded-2xl border border-[#1e3a5f] bg-[#12233d] p-5 text-left">
          <div className="mb-4 flex gap-2 text-xs font-bold">
            {(["upi", "phone", "stats"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  tab === t ? "bg-[#FF2D55] text-white" : "bg-[#1e3a5f] text-[#c9d4e2]"
                }`}
              >
                {t === "upi" ? "UPI Check" : t === "phone" ? "Phone Check" : "Live Stats"}
              </button>
            ))}
          </div>
          {tab === "upi" && <UpiDemo />}
          {tab === "phone" && <PhoneDemo />}
          {tab === "stats" && <LiveStatsDemo />}
        </div>
      </div>
    </section>
  );
}

function UpiDemo() {
  const [v, setV] = useState("");
  const [res, setRes] = useState<{ verdict: string; reports: number; type: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  async function check(upi: string) {
    setLoading(true);
    setRes(null);
    try {
      const { data } = await supabase
        .from("upi_blacklist")
        .select("reports,scam_type")
        .eq("upi_id", upi)
        .maybeSingle();
      const reports = data?.reports ?? 0;
      setRes({
        verdict: reports >= 5 ? "DANGER" : reports > 0 ? "SUSPICIOUS" : "SAFE",
        reports,
        type: data?.scam_type ?? null,
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="name@bank"
          className="flex-1 rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-3 py-2.5 text-sm"
        />
        <button
          onClick={() => check(v)}
          disabled={!v || loading}
          className="rounded-lg bg-[#FF2D55] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          {loading ? "…" : "Check"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["suspicious.refund@ybl", "lottery.prize@oksbi", "merchant.verified@paytm"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setV(s);
              check(s);
            }}
            className="rounded-full border border-[#1e3a5f] bg-[#0a1628] px-3 py-1 text-[11px] hover:border-[#FF2D55]"
          >
            {s}
          </button>
        ))}
      </div>
      {res && (
        <div className="mt-4 rounded-xl border border-[#1e3a5f] bg-[#0a1628] p-4 text-sm">
          <VerdictPill v={res.verdict} /> <span className="ml-2 text-xs text-[#8899aa]">{res.reports} reports</span>
          {res.type && <p className="mt-2 text-xs text-[#c9d4e2]">Type: {res.type}</p>}
        </div>
      )}
    </div>
  );
}

function PhoneDemo() {
  const [v, setV] = useState("");
  const [res, setRes] = useState<{ verdict: string; reports: number; type: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  async function check(raw: string) {
    setLoading(true);
    setRes(null);
    try {
      const n = raw.replace(/\D/g, "").slice(-10);
      const { data } = await supabase
        .from("phone_blacklist")
        .select("reports,scam_type")
        .eq("number", n)
        .maybeSingle();
      const reports = data?.reports ?? 0;
      setRes({
        verdict: reports >= 5 ? "DANGER" : reports > 0 ? "SUSPICIOUS" : "SAFE",
        reports,
        type: data?.scam_type ?? null,
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <div className="flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="+91 98765 43210"
          className="flex-1 rounded-lg border border-[#1e3a5f] bg-[#0a1628] px-3 py-2.5 text-sm"
        />
        <button
          onClick={() => check(v)}
          disabled={!v || loading}
          className="rounded-lg bg-[#FF2D55] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          {loading ? "…" : "Check"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["+91 98765 43210", "1800-11-2211"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setV(s);
              check(s);
            }}
            className="rounded-full border border-[#1e3a5f] bg-[#0a1628] px-3 py-1 text-[11px] hover:border-[#FF2D55]"
          >
            {s}
          </button>
        ))}
      </div>
      {res && (
        <div className="mt-4 rounded-xl border border-[#1e3a5f] bg-[#0a1628] p-4 text-sm">
          <VerdictPill v={res.verdict} /> <span className="ml-2 text-xs text-[#8899aa]">{res.reports} reports</span>
          {res.type && <p className="mt-2 text-xs text-[#c9d4e2]">Type: {res.type}</p>}
        </div>
      )}
    </div>
  );
}

function LiveStatsDemo() {
  const [stats, setStats] = useState<{ today: number; city: string; scam: string; last: string } | null>(null);
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: today } = await supabase
        .from("scam_reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      const { data: week } = await supabase
        .from("scam_reports")
        .select("city,type,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      const cities: Record<string, number> = {};
      const types: Record<string, number> = {};
      (week ?? []).forEach((r: any) => {
        if (r.city) cities[r.city] = (cities[r.city] ?? 0) + 1;
        if (r.type) types[r.type] = (types[r.type] ?? 0) + 1;
      });
      const topCity = Object.entries(cities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
      const last = week?.[0]?.created_at ?? new Date().toISOString();
      const mins = Math.max(1, Math.floor((Date.now() - new Date(last).getTime()) / 60000));
      setStats({
        today: (today as any)?.length ?? 0,
        city: topCity,
        scam: topType,
        last: `${mins} min ago`,
      });
    })();
  }, []);
  if (!stats) return <p className="text-sm text-[#8899aa]">Loading live data…</p>;
  return (
    <div className="grid grid-cols-2 gap-3 text-center">
      <StatMini v={stats.today} l="Reports today" />
      <StatMini v={stats.city} l="Most active city" />
      <StatMini v={stats.scam} l="Top scam this week" />
      <StatMini v={stats.last} l="Last report" />
    </div>
  );
}

function StatMini({ v, l }: { v: string | number; l: string }) {
  return (
    <div className="rounded-xl border border-[#1e3a5f] bg-[#0a1628] p-3">
      <p className="text-xl font-black text-[#FF2D55]">{v}</p>
      <p className="mt-0.5 text-[10px] uppercase text-[#8899aa]">{l}</p>
    </div>
  );
}

function VerdictPill({ v }: { v: string }) {
  const c = v === "DANGER" ? "#FF2D55" : v === "SUSPICIOUS" ? "#FF9500" : "#00C853";
  return (
    <span className="rounded-md px-2 py-1 text-xs font-black text-white" style={{ background: c }}>
      {v}
    </span>
  );
}

function HowItWorks() {
  const steps: [string, string, string][] = [
    ["🔑", "Get API Key", "Free trial in 30 seconds. No credit card needed."],
    ["💻", "Make API Call", "Simple REST API. Works with Python, JS, Java, PHP."],
    ["✅", "Get Result", "Instant verdict under 200ms. SAFE, SUSPICIOUS or DANGER."],
  ];
  return (
    <section className="border-t border-[#1e3a5f] px-5 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-black md:text-4xl">How It Works</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map(([icon, title, body], i) => (
            <div
              key={title}
              className="relative rounded-2xl border border-[#1e3a5f] bg-[#12233d] p-6 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF2D55]/15 text-3xl">
                {icon}
              </div>
              <p className="mt-3 text-lg font-black">
                {i + 1}. {title}
              </p>
              <p className="mt-2 text-sm text-[#8899aa]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExamples() {
  const [tab, setTab] = useState<"js" | "py">("js");
  const code = useMemo(
    () =>
      tab === "js"
        ? `const res = await fetch(
  'https://api.scanscam.in/check-upi',
  {
    method: 'POST',
    headers: {
      'X-API-Key': 'your_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      upi_id: 'suspicious@ybl'
    })
  }
);
// Response:
// {
//   verdict: "DANGER",
//   trust_score: 2,
//   reports: 47,
//   scam_type: "Fake Refund",
//   recommendation: "DO NOT PAY"
// }`
        : `import requests
r = requests.post(
  'https://api.scanscam.in/check-upi',
  headers={'X-API-Key': 'your_key'},
  json={'upi_id': 'suspicious@ybl'}
)
print(r.json())
# {'verdict':'DANGER','reports':47}`,
    [tab],
  );
  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2">
            {(["js", "py"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                  tab === t ? "bg-[#FF2D55] text-white" : "bg-[#12233d] text-[#c9d4e2]"
                }`}
              >
                {t === "js" ? "JavaScript" : "Python"}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              toast.success("Copied");
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#1e3a5f] bg-[#12233d] px-3 py-1.5 text-xs font-bold"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        </div>
        <pre className="overflow-auto rounded-2xl border border-[#1e3a5f] bg-[#12233d] p-5 text-xs leading-relaxed text-[#c9d4e2]">
          <code>{code}</code>
        </pre>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "₹25,000",
      per: "/month",
      features: ["10,000 calls", "UPI + Phone check", "Email support", "99% uptime"],
      cta: "Start Free Trial",
      highlight: false,
    },
    {
      name: "Professional",
      price: "₹75,000",
      per: "/month",
      features: [
        "50,000 calls",
        "All endpoints",
        "Bulk check",
        "Webhooks",
        "Priority support",
        "Weekly reports",
      ],
      cta: "Start Free Trial",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      per: "",
      features: ["Unlimited calls", "White label", "On-premise", "99.99% SLA"],
      cta: "Contact Sales",
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="border-t border-[#1e3a5f] px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-black md:text-4xl">Simple, Transparent Pricing</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-6 ${
                p.highlight
                  ? "border-[#FF2D55] bg-gradient-to-b from-[#FF2D55]/10 to-transparent"
                  : "border-[#1e3a5f] bg-[#12233d]"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF2D55] px-3 py-1 text-[10px] font-black uppercase text-white">
                  🔥 Most Popular
                </span>
              )}
              <p className="text-sm font-bold uppercase text-[#8899aa]">{p.name}</p>
              <p className="mt-2 text-4xl font-black">
                {p.price}
                <span className="text-sm font-medium text-[#8899aa]">{p.per}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[#c9d4e2]">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#00C853]" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href="#contact"
                className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-black ${
                  p.highlight
                    ? "bg-[#FF2D55] text-white shadow shadow-[#FF2D55]/30"
                    : "border border-[#1e3a5f] bg-[#0a1628] text-white"
                }`}
              >
                {p.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const items: [string, string, string][] = [
    ["👥", "Community Powered", "Thousands of Indians report new scams every day."],
    ["⚡", "Lightning Fast", "Verdict in under 200ms — production ready."],
    ["🇮🇳", "India Specific", "Trained on Indian scam patterns and languages."],
    ["🔒", "Bank Grade Security", "TLS, encrypted at rest, SOC2 in progress."],
    ["📊", "Rich Data", "Reports, type, city, recency and confidence."],
    ["🔄", "Always Updated", "Live signals — no stale batch models."],
  ];
  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-black md:text-4xl">Why Banks & Fintechs Choose Us</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-3">
          {items.map(([i, t, b]) => (
            <div key={t} className="rounded-2xl border border-[#1e3a5f] bg-[#12233d] p-5">
              <p className="text-2xl">{i}</p>
              <p className="mt-2 font-black">{t}</p>
              <p className="mt-1 text-sm text-[#8899aa]">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qs: [string, string][] = [
    ["How accurate is the API?", "Verdicts blend community reports, on-device heuristics and LLM-scored signals — production accuracy above 96% on flagged Indian UPI IDs."],
    ["How long does integration take?", "Most fintechs go live within a day using our REST endpoint and Postman collection."],
    ["What are the free trial details?", "30 days, up to 5,000 free calls, no credit card required."],
    ["How often is data updated?", "Real-time — community submissions and heuristics update the database within seconds."],
    ["Are you GDPR / DPDP compliant?", "Yes. We do not store PII and offer data residency in India for enterprise plans."],
    ["What if I exceed my limit?", "You'll be notified at 80% and 100%. Overage is billed per-call or you can upgrade."],
    ["Is there an SLA guarantee?", "99.9% uptime on Professional, 99.99% on Enterprise with financial credits."],
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-t border-[#1e3a5f] px-5 py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-black md:text-4xl">Frequently Asked</h2>
        <div className="mt-8 space-y-2">
          {qs.map(([q, a], i) => (
            <div key={q} className="rounded-2xl border border-[#1e3a5f] bg-[#12233d]">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-bold"
              >
                {q}
                <ChevronDown className={`h-4 w-4 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="border-t border-[#1e3a5f] px-5 py-4 text-sm text-[#c9d4e2]">{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [f, setF] = useState({ company: "", name: "", email: "", phone: "", volume: "10k-50k", message: "" });
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.company || !f.name || !f.email || !f.phone) {
      return toast.error("Please fill required fields");
    }
    const subject = `API Trial - ${f.company}`;
    const body = `Company: ${f.company}\nName: ${f.name}\nEmail: ${f.email}\nPhone: ${f.phone}\nVolume: ${f.volume}\n\n${f.message}`;
    window.location.href = `mailto:sales@scanscam.in?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    toast.success("Request drafted — send from your email client");
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  return (
    <section id="contact" className="px-5 py-20">
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#1e3a5f] bg-[#12233d] p-8">
        <h2 className="text-center text-3xl font-black">Get Your Free API Key</h2>
        <p className="mt-1 text-center text-sm text-[#8899aa]">30 days free · No credit card</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input placeholder="Company Name *" value={f.company} onChange={set("company")} />
          <Input placeholder="Your Name *" value={f.name} onChange={set("name")} />
          <Input placeholder="Work Email *" type="email" value={f.email} onChange={set("email")} />
          <Input placeholder="Phone Number *" value={f.phone} onChange={set("phone")} />
          <select
            value={f.volume}
            onChange={set("volume")}
            className="w-full rounded-xl border border-[#1e3a5f] bg-[#0a1628] px-4 py-3 text-sm"
          >
            <option>Under 10k / month</option>
            <option>10k-50k / month</option>
            <option>50k-500k / month</option>
            <option>500k+ / month</option>
          </select>
          <textarea
            placeholder="Message (optional)"
            value={f.message}
            onChange={set("message")}
            rows={3}
            className="w-full rounded-xl border border-[#1e3a5f] bg-[#0a1628] px-4 py-3 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-[#FF2D55] py-3.5 text-sm font-black text-white shadow shadow-[#FF2D55]/30"
          >
            🚀 Request Free Trial
          </button>
        </form>
      </div>
    </section>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-[#1e3a5f] bg-[#0a1628] px-4 py-3 text-sm text-white placeholder:text-[#8899aa]"
    />
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#1e3a5f] px-5 py-12 text-sm text-[#8899aa]">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-4">
        <div>
          <p className="font-black text-white">
            Scan<span className="text-[#FF2D55]">Scam</span>
          </p>
          <p className="mt-2 text-xs">India's #1 free AI fraud detector.</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase text-white">Product</p>
          <ul className="space-y-1 text-xs">
            <li><Link to="/">App</Link></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#demo">API Demo</a></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase text-white">Company</p>
          <ul className="space-y-1 text-xs">
            <li><a href="#contact">Contact</a></li>
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase text-white">Connect</p>
          <ul className="space-y-1 text-xs">
            <li>hello@scanscam.in</li>
            <li>sales@scanscam.in</li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-center text-xs">
        © 2026 ScanScam India · Protecting India from fraud 🛡️
      </p>
    </footer>
  );
}
