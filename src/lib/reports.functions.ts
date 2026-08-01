import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportSchema, MANUAL_REVIEW_AMOUNT } from "@/lib/report-validation";

/** hCaptcha test keys are used until real keys are configured as secrets. */
const TEST_SECRET = "0x0000000000000000000000000000000000000000";

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createHash } = await import("node:crypto");
    const pepper = process.env["SUPABASE_URL"] ?? "scanscam";
    const hash = (v: string) => createHash("sha256").update(`${pepper}:${v}`).digest("hex");

    // 1. CAPTCHA — verified server-side, never trusted from the client
    const secret = process.env["HCAPTCHA_SECRET"] ?? TEST_SECRET;
    try {
      const res = await fetch("https://api.hcaptcha.com/siteverify", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: data.captchaToken }),
      });
      const json = (await res.json()) as { success?: boolean };
      if (!json.success) throw new Error("captcha_failed");
    } catch (e) {
      throw new Error(e instanceof Error && e.message === "captcha_failed" ? "captcha_failed" : "captcha_unavailable");
    }

    // 2. Abuse fingerprints (hashed, stored for throttling only)
    let ip: string | undefined;
    try {
      ip = getRequestIP({ xForwardedFor: true });
    } catch {
      ip = undefined;
    }

    // 3. Server-side validation, rate limiting and duplicate grouping live in the DB fn
    const { data: rows, error } = await context.supabase.rpc("submit_scam_report", {
      _type: data.type,
      _description: data.description,
      _city: data.city,
      _state: data.state,
      _lat: data.lat,
      _lng: data.lng,
      _link: data.link || undefined,
      _bank: data.bank || undefined,
      _phone: data.phone || undefined,
      _upi_id: data.upi_id || undefined,
      _amount_lost: data.amount_lost,
      _screenshot_url: data.screenshot_url || undefined,
      _fingerprint_hash: data.fingerprint ? hash(data.fingerprint) : undefined,
      _ip_hash: ip ? hash(ip) : undefined,
    });

    if (error) throw new Error(error.message.replace(/^.*\b(auth_required|verification_required|account_blocked|rate_limited|description_too_short|link_or_bank_required|invalid_link|invalid_amount|amount_too_large)\b.*$/, "$1"));

    const row = Array.isArray(rows) ? rows[0] : rows;

    // 4. Public counters only ever count approved reports (RLS enforces this too)
    const { count } = await context.supabase
      .from("scam_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved");

    return {
      id: row?.id ?? null,
      status: row?.status ?? "pending",
      flagged: Boolean(row?.flagged),
      duplicate: Boolean(row?.duplicate),
      reportCount: row?.report_count ?? 1,
      approvedTotal: count ?? 0,
      needsManualReview: Boolean(row?.flagged) || data.amount_lost > MANUAL_REVIEW_AMOUNT,
    };
  });
