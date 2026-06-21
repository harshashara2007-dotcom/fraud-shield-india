import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { SCAM_TYPES, INDIAN_CITIES } from "@/lib/format";
import { Check, ChevronRight, ExternalLink, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Report a Scam — ScanScam" }] }),
  component: ReportScreen,
});

function ReportScreen() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [upi, setUpi] = useState("");
  const [link, setLink] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState(INDIAN_CITIES[0].city);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ total: number } | null>(null);
  const nav = useNavigate();

  // Prefill city from geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      let best = INDIAN_CITIES[0];
      let dist = Infinity;
      for (const c of INDIAN_CITIES) {
        const d = (c.lat - latitude) ** 2 + (c.lng - longitude) ** 2;
        if (d < dist) { dist = d; best = c; }
      }
      setCity(best.city);
    });
  }, []);

  async function submit() {
    if (!type) return;
    setSubmitting(true);
    try {
      const c = INDIAN_CITIES.find((x) => x.city === city) ?? INDIAN_CITIES[0];
      const jitter = () => (Math.random() - 0.5) * 0.05;

      let screenshotPath: string | null = null;
      if (file) {
        const path = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("scam-screenshots").upload(path, file);
        if (!error) screenshotPath = path;
      }

      await supabase.from("scam_reports").insert({
        type,
        phone: phone || null,
        upi_id: upi || null,
        link: link || null,
        amount_lost: amount ? Number(amount) : 0,
        description: description || null,
        city: c.city,
        state: c.state,
        lat: c.lat + jitter(),
        lng: c.lng + jitter(),
        screenshot_url: screenshotPath,
      });

      if (phone) {
        const n = phone.replace(/\D/g, "").slice(-10);
        const { data: ex } = await supabase.from("phone_blacklist").select("id,reports").eq("number", n).maybeSingle();
        if (ex) await supabase.from("phone_blacklist").update({ reports: (ex.reports ?? 0) + 1 }).eq("id", ex.id);
        else await supabase.from("phone_blacklist").insert({ number: n, scam_type: type });
      }
      if (upi) {
        const { data: ex } = await supabase.from("upi_blacklist").select("id,reports").eq("upi_id", upi).maybeSingle();
        if (ex) await supabase.from("upi_blacklist").update({ reports: (ex.reports ?? 0) + 1 }).eq("id", ex.id);
        else await supabase.from("upi_blacklist").insert({ upi_id: upi, scam_type: type });
      }

      const { count } = await supabase.from("scam_reports").select("*", { count: "exact", head: true });
      // bump safety score
      try {
        const s = JSON.parse(localStorage.getItem("ss_safety") ?? "{}");
        s.reports = (s.reports ?? 0) + 1;
        localStorage.setItem("ss_safety", JSON.stringify(s));
      } catch {}
      setSuccess({ total: count ?? 0 });
      navigator.vibrate?.(80);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <AppShell header={<ScreenHeader title="Report submitted" />}>
        <div className="flex flex-col items-center gap-4 px-6 pt-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-safe/15">
            <CheckCircle2 className="h-14 w-14 text-safe" />
          </div>
          <h2 className="text-2xl font-black">🎉 Report submitted!</h2>
          <p className="text-sm text-muted-foreground">
            You helped protect <span className="font-bold text-foreground">{success.total.toLocaleString("en-IN")}</span> Indians.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 pt-2">
            {["🔍 Scam Spotter", "🛡️ Community Guardian", "📢 First Reporter"].map((b) => (
              <span key={b} className="rounded-full bg-card border border-border px-3 py-1 text-xs font-bold">{b}</span>
            ))}
          </div>
          <button onClick={() => nav({ to: "/" })} className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white">
            Back to home
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={<ScreenHeader title="Report a scam" subtitle={`Step ${step} of 3`} />}>
      <div className="px-4 pb-8 pt-3">
        <div className="mb-4 flex gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 className="mb-3 text-base font-bold">What kind of scam?</h2>
            <div className="grid grid-cols-2 gap-2">
              {SCAM_TYPES.filter((t) => !["Phone", "Link", "OTP"].includes(t.id)).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border bg-card p-4 text-sm font-semibold transition-all active:scale-95 ${
                    type === t.id ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <span className="text-3xl">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => type && setStep(2)}
              disabled={!type}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="mb-3 text-base font-bold">Evidence (all optional)</h2>
            <div className="space-y-2">
              <Input label="Phone number" placeholder="98765 43210" value={phone} onChange={setPhone} />
              <Input label="UPI ID" placeholder="name@bank" value={upi} onChange={setUpi} />
              <Input label="Suspicious link" placeholder="https://…" value={link} onChange={setLink} />
              <Input label="Amount lost (₹)" placeholder="0" value={amount} onChange={setAmount} type="number" />
              <div>
                <label className="text-xs font-semibold text-muted-foreground">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
                >
                  {INDIAN_CITIES.map((c) => (
                    <option key={c.city} value={c.city}>{c.city}, {c.state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What happened?"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Screenshot</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-action file:px-3 file:py-2 file:text-white"
                />
                {file && <p className="mt-1 text-xs text-safe">✓ {file.name}</p>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setStep(1)} className="rounded-xl border border-border bg-card py-3.5 text-sm font-bold">Back</button>
              <button onClick={() => setStep(3)} className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white">Continue</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="mb-3 text-base font-bold">File complaints</h2>
            <ul className="space-y-2">
              <Channel done label="ScanScam community database" />
              <Channel done label="Live alert to nearby users" />
              <Channel href="https://cybercrime.gov.in" label="cybercrime.gov.in" />
              <Channel href="https://cms.rbi.org.in" label="RBI Complaint Portal" />
            </ul>
            <button
              onClick={submit}
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
            <Link to="/" className="mt-2 block text-center text-xs text-muted-foreground">Cancel</Link>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Input({ label, ...rest }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        {...rest}
        onChange={(e) => rest.onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-action focus:outline-none"
      />
    </div>
  );
}

function Channel({ done, href, label }: { done?: boolean; href?: string; label: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
      <span className="flex items-center gap-2">
        {done ? <Check className="h-4 w-4 text-safe" /> : <span className="text-xs">📋</span>}
        {label}
      </span>
      {href ? (
        <a href={href} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs font-semibold text-action">
          Open <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-[10px] font-bold uppercase text-safe">Auto</span>
      )}
    </li>
  );
}
