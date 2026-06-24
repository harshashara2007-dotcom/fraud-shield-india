// Heuristics for SAFE/GENUINE detection.

export function normalizePhone(input: string): string {
  return input.replace(/[^\d]/g, "");
}

export function isTollFreePattern(num: string): boolean {
  const n = normalizePhone(num);
  // 1800/1860/1900 toll free, or short emergency numbers
  if (/^1(800|860|900)/.test(n)) return true;
  if (n.length === 3 && ["100", "101", "108", "112"].includes(n)) return true;
  if (n.length === 4 && ["1930", "1947", "1991", "1503"].includes(n)) return true;
  if (n.length === 3 && n === "139") return true;
  if (n === "14646") return true;
  return false;
}

export function isCorporateLandline(num: string): boolean {
  const n = normalizePhone(num);
  // 011/022/033/044/080 etc with 7-8 more digits
  return /^(011|022|033|040|044|079|080)\d{7,8}$/.test(n);
}

const URGENCY_WORDS = [
  "urgent", "immediately", "blocked", "suspended", "verify now", "act now",
  "expire", "expiring", "kyc", "click here", "winner", "won", "lottery",
  "reward", "claim", "refund", "tax refund", "legal action", "arrest",
  "police", "court", "last chance", "limited time", "frozen",
];

const OTP_WORDS = ["otp", "one time password", "pin", "cvv", "password", "share code"];

const LINK_REGEX = /(https?:\/\/|www\.|bit\.ly|tinyurl|t\.co|wa\.me|rb\.gy|cutt\.ly)\S*/i;
const SUSPICIOUS_TLD = /\.(xyz|top|click|info|live|tk|ml|ga|cf|ru)\b/i;

export type SafetyCheck = {
  label: string;
  passed: boolean;
  points: number;
};

export type SafetyResult = {
  score: number; // 0-100
  level: "SCAM" | "SUSPICIOUS" | "UNCERTAIN" | "GENUINE";
  checks: SafetyCheck[];
};

export function scoreMessage(message: string, knownSenders: string[] = []): SafetyResult {
  const text = message || "";
  const lower = text.toLowerCase();

  // Detect a sender ID at the start of the message (e.g. "VM-SBIBNK:")
  const senderMatch = text.match(/(?:^|\n)\s*([A-Z]{2}-[A-Z0-9]{5,8})\b/);
  const sender = senderMatch?.[1] ?? "";
  const senderOfficial = sender && knownSenders.some((s) => s.toUpperCase() === sender.toUpperCase());
  const senderLooksLikeDLT = /^[A-Z]{2}-[A-Z0-9]{6}$/.test(sender);

  const hasOtpAsk =
    OTP_WORDS.some((w) => lower.includes(w)) &&
    /(share|tell|give|send|enter|provide)/i.test(text);
  const hasLink = LINK_REGEX.test(text);
  const hasSuspiciousTld = SUSPICIOUS_TLD.test(text);
  const urgencyHits = URGENCY_WORDS.filter((w) => lower.includes(w)).length;
  const grammarOk = text.length === 0 || (text.match(/[A-Z]/g)?.length ?? 0) / Math.max(text.length, 1) < 0.6;
  const transactionPattern = /(rs\.?|inr|₹)\s?\d/i.test(text) && /(debit|credit|paid|received|upi|txn|transaction|balance)/i.test(text);

  const checks: SafetyCheck[] = [
    {
      label: senderOfficial ? `Official sender ID: ${sender}` : senderLooksLikeDLT ? "DLT sender format detected" : "Official sender ID",
      passed: senderOfficial || senderLooksLikeDLT,
      points: senderOfficial ? 25 : senderLooksLikeDLT ? 12 : 0,
    },
    { label: "No request to share OTP/PIN", passed: !hasOtpAsk, points: hasOtpAsk ? 0 : 20 },
    { label: "No suspicious links", passed: !hasLink || (!hasSuspiciousTld && !!senderOfficial), points: !hasLink ? 20 : hasSuspiciousTld ? 0 : senderOfficial ? 15 : 5 },
    { label: "No urgency / panic words", passed: urgencyHits === 0, points: Math.max(0, 15 - urgencyHits * 6) },
    { label: "Correct grammar (not all caps)", passed: grammarOk, points: grammarOk ? 10 : 0 },
    { label: "Matches known safe pattern", passed: transactionPattern, points: transactionPattern ? 10 : 0 },
  ];

  const score = Math.max(0, Math.min(100, checks.reduce((s, c) => s + c.points, 0)));
  let level: SafetyResult["level"] = "UNCERTAIN";
  if (score <= 30) level = "SCAM";
  else if (score <= 60) level = "SUSPICIOUS";
  else if (score <= 80) level = "UNCERTAIN";
  else level = "GENUINE";

  return { score, level, checks };
}

export function levelColor(level: SafetyResult["level"]) {
  switch (level) {
    case "GENUINE":
      return { bg: "bg-safe/15", border: "border-safe", text: "text-safe", icon: "✅", hex: "#00C853" };
    case "UNCERTAIN":
      return { bg: "bg-yellow-500/15", border: "border-yellow-500", text: "text-yellow-500", icon: "🟡", hex: "#EAB308" };
    case "SUSPICIOUS":
      return { bg: "bg-warning/15", border: "border-warning", text: "text-warning", icon: "⚠️", hex: "#FF9500" };
    case "SCAM":
      return { bg: "bg-danger/15", border: "border-danger", text: "text-danger", icon: "🚨", hex: "#FF2D55" };
  }
}
