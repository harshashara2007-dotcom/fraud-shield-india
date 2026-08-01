import { z } from "zod";

export const MAX_REPORTS_PER_DAY = 5;
/** Amounts above this (₹1 crore) are accepted but flagged for manual review. */
export const MANUAL_REVIEW_AMOUNT = 10_000_000;
/** Hard upper bound (₹100 crore) — rejected outright. */
export const MAX_AMOUNT = 1_000_000_000;

const URL_RE = /^https?:\/\/[a-z0-9][a-z0-9._-]*\.[a-z]{2,}(:\d+)?(\/[^\s]*)?$/i;

export const reportSchema = z
  .object({
    type: z.string().trim().min(1, "Pick a scam type"),
    description: z
      .string()
      .trim()
      .min(20, "Description must be at least 20 characters")
      .max(2000, "Description is too long"),
    link: z.string().trim().max(500).optional().or(z.literal("")),
    bank: z.string().trim().max(120).optional().or(z.literal("")),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    upi_id: z.string().trim().max(120).optional().or(z.literal("")),
    amount_lost: z
      .number({ invalid_type_error: "Amount must be a number" })
      .int("Amount must be a whole number")
      .min(0, "Amount cannot be negative")
      .max(MAX_AMOUNT, "Amount is unrealistically large"),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    lat: z.number(),
    lng: z.number(),
    screenshot_url: z.string().trim().max(500).optional().or(z.literal("")),
    fingerprint: z.string().trim().max(200).optional().or(z.literal("")),
    captchaToken: z.string().trim().min(1, "Please complete the captcha"),
  })
  .refine((v) => (v.link && v.link.length > 0) || (v.bank && v.bank.length > 0), {
    message: "Add either a suspicious link or the bank involved",
    path: ["link"],
  })
  .refine((v) => !v.link || URL_RE.test(v.link), {
    message: "Enter a valid URL, e.g. https://example.com/page",
    path: ["link"],
  });

export type ReportInput = z.infer<typeof reportSchema>;

/** Client-side mirror of the server rules; returns a field->message map. */
export function validateReportDraft(draft: {
  type: string | null;
  description: string;
  link: string;
  bank: string;
  amount: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.type) errors.type = "Pick a scam type";
  if (draft.description.trim().length < 20)
    errors.description = `Description needs at least 20 characters (${draft.description.trim().length}/20)`;
  if (!draft.link.trim() && !draft.bank.trim())
    errors.link = "Add either a suspicious link or the bank involved";
  else if (draft.link.trim() && !URL_RE.test(draft.link.trim()))
    errors.link = "Enter a valid URL, e.g. https://example.com/page";
  if (draft.amount.trim()) {
    const n = Number(draft.amount);
    if (!Number.isFinite(n) || !Number.isInteger(n)) errors.amount = "Amount must be a whole number";
    else if (n < 0) errors.amount = "Amount cannot be negative";
    else if (n > MAX_AMOUNT) errors.amount = "Amount is unrealistically large";
  }
  return errors;
}

export const SUBMIT_ERRORS: Record<string, string> = {
  auth_required: "Please sign in to submit a report.",
  verification_required: "Verify your email or phone number before reporting.",
  account_blocked: "Your account cannot submit reports.",
  rate_limited: `You have reached the limit of ${MAX_REPORTS_PER_DAY} reports in 24 hours.`,
  description_too_short: "Description must be at least 20 characters.",
  link_or_bank_required: "Add either a suspicious link or the bank involved.",
  invalid_link: "The link is not a valid URL.",
  invalid_amount: "Amount cannot be negative.",
  amount_too_large: "That amount is unrealistically large.",
  captcha_failed: "Captcha verification failed — please try again.",
};
