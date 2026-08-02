/**
 * Shared translation of server-side AI error codes into user-facing messages.
 * The server functions in `ai.functions.ts` throw stable codes (see below) and
 * log the underlying provider/database error server-side, so the UI can show a
 * specific message instead of one generic "AI analysis failed".
 */
export type AiErrorCode =
  | "auth_required"
  | "insufficient_credits"
  | "credits_unavailable"
  | "invalid_input"
  | "ai_unavailable"
  | "unknown";

export function aiErrorCode(err: unknown): AiErrorCode {
  const msg = String(
    (err as { message?: string } | null)?.message ?? err ?? "",
  ).toLowerCase();

  if (!msg) return "unknown";
  if (msg.includes("insufficient_credits")) return "insufficient_credits";
  if (msg.includes("credits_unavailable")) return "credits_unavailable";
  if (
    msg.includes("auth_required") ||
    msg.includes("unauthorized") ||
    msg.includes("no authorization header") ||
    msg.includes("invalid token") ||
    msg.includes("jwt")
  ) {
    return "auth_required";
  }
  if (msg.includes("ai_unavailable") || msg.includes("ai_config_missing")) return "ai_unavailable";
  if (msg.includes("invalid_input") || msg.includes("validation") || msg.includes("expected string"))
    return "invalid_input";
  return "unknown";
}

const MESSAGES: Record<AiErrorCode, string> = {
  auth_required: "Please sign in to run this scan.",
  insufficient_credits: "Out of credits — top up from your profile.",
  credits_unavailable: "Couldn't check your credit balance. Please try again in a moment.",
  invalid_input: "That input couldn't be read. Please try a clearer scan or a different value.",
  ai_unavailable: "Analysis service unavailable, please try again.",
  unknown: "Something went wrong during analysis. Please try again.",
};

/** Human-readable message for any error thrown by an AI server function. */
export function aiErrorMessage(err: unknown): string {
  const code = aiErrorCode(err);
  const base = MESSAGES[code];
  if (code !== "unknown") return base;
  const raw = String((err as { message?: string } | null)?.message ?? "").trim();
  // Surface the real message when we have one — easier to diagnose than a generic string.
  return raw && raw.length < 160 ? `${base} (${raw})` : base;
}
