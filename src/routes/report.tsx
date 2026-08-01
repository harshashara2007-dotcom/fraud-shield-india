import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { LocationCombobox } from "@/components/LocationCombobox";
import { Captcha, deviceFingerprint } from "@/components/Captcha";
import { supabase } from "@/integrations/supabase/client";
import { submitReport } from "@/lib/reports.functions";
import {
  validateReportDraft,
  SUBMIT_ERRORS,
  MAX_REPORTS_PER_DAY,
  MANUAL_REVIEW_AMOUNT,
} from "@/lib/report-validation";
import { SCAM_TYPES } from "@/lib/format";
import { INDIA_LOCATIONS, type IndiaLocation } from "@/lib/india-locations";
import { INDIAN_BANKS } from "@/lib/banks";
import { ChevronRight, ExternalLink, CheckCircle2, Clock, ShieldCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a Scam — ScanScam" },
      {
        name: "description",
        content:
          "Report a fraud attempt to ScanScam. Every report is verified and reviewed by moderators before it appears publicly.",
      },
      { property: "og:title", content: "Report a Scam — ScanScam" },
      {
        property: "og:description",
        content: "Submit a verified scam report. Reviewed by moderators before it goes live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportScreen,
});

type Verdict = {
  status: string;
  flagged: boolean;
  duplicate: boolean;
  reportCount: number;
  approvedTotal: number;
  needsManualReview: boolean;
};

function ReportScreen() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [upi, setUpi] = useState("");
  const [link, setLink] = useState("");
  const [bank, setBank] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState<IndiaLocation>(INDIA_LOCATIONS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<Verdict | null>(null);
  const [auth, setAuth] = useState<{ signedIn: boolean; verified: boolean } | null>(null);
  const nav = useNavigate();
  const submit = useServerFn(submitReport);

  const onToken = useCallback((t: string | null) => setCaptchaToken(t), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setAuth({
        signedIn: Boolean(u),
        verified: Boolean(u?.email_confirmed_at || u?.phone_confirmed_at),
      });
    });
  }, []);

  // Prefill city from geolocation using nearest location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      let best = INDIA_LOCATIONS[0];
      let dist = Infinity;
      for (const c of INDIA_LOCATIONS) {
        const d = (c.lat - latitude) ** 2 + (c.lng - longitude) ** 2;
        if (d < dist) {
          dist = d;
          best = c;
        }
      }
      setCity(best);
    });
  }, []);

  function validateStep2() {
    const e = validateReportDraft({ type, description, link, bank, amount });
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0]);
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!type || !validateStep2()) return;
    if (!captchaToken) {
      toast.error("Please complete the captcha first");
      return;
    }
    setSubmitting(true);
    try {
      const c = city;
      const jitter = () => (Math.random() - 0.5) * 0.05;

      let screenshotPath: string | null = null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error("Screenshot must be under 8 MB");
        if (!file.type.startsWith("image/")) throw new Error("Screenshot must be an image");
        const path = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("scam-screenshots").upload(path, file);
        if (!error) screenshotPath = path;
      }

      const result = await submit({
        data: {
          type,
          description: description.trim(),
          link: link.trim(),
          bank: bank.trim(),
          phone: phone.trim(),
          upi_id: upi.trim(),
          amount_lost: amount.trim() ? Number(amount) : 0,
          city: c.city,
          state: c.state,
          lat: c.lat + jitter(),
          lng: c.lng + jitter(),
          screenshot_url: screenshotPath ?? "",
          fingerprint: deviceFingerprint(),
          captchaToken,
        },
      });

      if (phone) {
        const n = phone.replace(/\D/g, "").slice(-10);
        await supabase.rpc("increment_phone_report", { _number: n, _scam_type: type });
      }
      if (upi) await supabase.rpc("increment_upi_report", { _upi_id: upi, _scam_type: type });

      setSuccess(result as Verdict);
      navigator.vibrate?.(80);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "Could not submit";
      const key = Object.keys(SUBMIT_ERRORS).find((k) => raw.includes(k));
      toast.error(key ? SUBMIT_ERRORS[key] : raw);
      window.hcaptcha?.reset();
      setCaptchaToken(null);
    } finally {
      setSubmitting(false);
    }
  }

  if (auth && (!auth.signedIn || !auth.verified)) {
    return (
      <AppShell header={<ScreenHeader title="Report a scam" />}>
        <div className="flex flex-col items-center gap-4 px-6 pt-10 text-center">
          <ShieldCheck className="h-14 w-14 text-action" />
          <h2 className="text-xl font-black">
            {auth.signedIn ? "Verify your account first" : "Sign in to report"}
          </h2>
          <p className="text-sm text-muted-foreground">
            To keep the community database trustworthy, only verified accounts can submit reports. Every
            report is reviewed by a moderator before it appears publicly.
          </p>
          <Link
            to={auth.signedIn ? "/profile" : "/auth"}
            className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
          >
            {auth.signedIn ? "Verify email or phone" : "Sign in / Create account"}
          </Link>
          <Link to="/" className="text-xs text-muted-foreground">
            Back to home
          </Link>
        </div>
      </AppShell>
    );
  }

  if (success) {
    return (
      <AppShell header={<ScreenHeader title="Report received" />}>
        <div className="flex flex-col items-center gap-4 px-6 pt-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-warning/15">
            {success.duplicate ? (
              <CheckCircle2 className="h-14 w-14 text-warning" />
            ) : (
              <Clock className="h-14 w-14 text-warning" />
            )}
          </div>
          <h2 className="text-2xl font-black">
            {success.duplicate ? "Added to an existing report" : "Report under review"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {success.duplicate
              ? `We matched your report to an existing one — it now has ${success.reportCount} reports backing it.`
              : "A moderator will verify your report before it becomes public. Unverified reports never count towards public stats."}
          </p>
          {success.needsManualReview && (
            <p className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="h-4 w-4" /> Flagged for extra manual verification
            </p>
          )}
          <div className="w-full rounded-xl border border-border bg-card p-4 text-left text-xs">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Status</span>
              <span className="font-bold uppercase text-warning">{success.status}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Verified reports in database</span>
              <span className="font-bold">{success.approvedTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <button
            onClick={() => nav({ to: "/" })}
            className="mt-2 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
          >
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
            <h2 className="mb-1 text-base font-bold">Evidence</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              A description (20+ characters) and either a link or the bank involved are required.
            </p>
            <div className="space-y-2">
              <Input label="Phone number" placeholder="98765 43210" value={phone} onChange={setPhone} />
              <Input label="UPI ID" placeholder="name@bank" value={upi} onChange={setUpi} />
              <Input
                label="Suspicious link *"
                placeholder="https://…"
                value={link}
                onChange={setLink}
                error={errors.link}
              />
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Bank involved *</label>
                <input
                  list="banks-list"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="Search or type your bank"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm focus:border-action focus:outline-none"
                />
                <datalist id="banks-list">
                  {INDIAN_BANKS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <div className="scrollbar-none mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {INDIAN_BANKS.slice(0, 12).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBank(b)}
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                        bank === b
                          ? "border-action bg-action/15 text-action"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {b.replace(/\s*\(.*\)/, "")}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Amount lost (₹)"
                placeholder="0"
                value={amount}
                onChange={setAmount}
                type="number"
                error={errors.amount}
              />
              {amount && Number(amount) > MANUAL_REVIEW_AMOUNT && (
                <p className="text-[11px] text-warning">
                  Amounts above ₹1 crore are flagged for manual verification.
                </p>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">City or district</label>
                <div className="mt-1">
                  <LocationCombobox value={city} onChange={setCity} />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Search across {INDIA_LOCATIONS.length}+ districts of India.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Description * ({description.trim().length}/20 min)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="What happened? Include how they contacted you and what they asked for."
                  className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm"
                />
                {errors.description && <p className="mt-1 text-xs text-danger">{errors.description}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Screenshot (optional)</label>
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
              <button
                onClick={() => setStep(1)}
                className="rounded-xl border border-border bg-card py-3.5 text-sm font-bold"
              >
                Back
              </button>
              <button
                onClick={() => validateStep2() && setStep(3)}
                className="rounded-xl bg-primary py-3.5 text-sm font-bold text-white"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="mb-1 text-base font-bold">Confirm & submit</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Your report goes to moderators first. Nothing is marked confirmed automatically.
            </p>
            <ul className="space-y-2">
              <Channel state="pending" label="Moderator review of your report" />
              <Channel state="pending" label="Public listing after approval" />
              <Channel state="info" label="Duplicate reports are merged, not double-counted" />
              <Channel href="https://cybercrime.gov.in" label="File officially at cybercrime.gov.in" />
              <Channel href="https://cms.rbi.org.in" label="RBI Complaint Portal" />
            </ul>

            <div className="mt-4 rounded-xl border border-border bg-card p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                Confirm you are human (max {MAX_REPORTS_PER_DAY} reports / 24h)
              </p>
              <Captcha onToken={onToken} />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !captchaToken}
              className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
            <button
              onClick={() => setStep(2)}
              className="mt-2 w-full text-center text-xs text-muted-foreground"
            >
              Back to evidence
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Input({
  label,
  error,
  ...rest
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        {...rest}
        onChange={(e) => rest.onChange(e.target.value)}
        className={`mt-1 w-full rounded-xl border bg-card px-4 py-2.5 text-sm focus:outline-none ${
          error ? "border-danger" : "border-border focus:border-action"
        }`}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function Channel({
  state,
  href,
  label,
}: {
  state?: "pending" | "info";
  href?: string;
  label: string;
}) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
      <span className="flex items-center gap-2">
        {state === "pending" ? (
          <Clock className="h-4 w-4 text-warning" />
        ) : state === "info" ? (
          <ShieldCheck className="h-4 w-4 text-action" />
        ) : (
          <span className="text-xs">📋</span>
        )}
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1 text-xs font-semibold text-action"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      ) : state === "pending" ? (
        <span className="text-[10px] font-bold uppercase text-warning">Pending</span>
      ) : null}
    </li>
  );
}
