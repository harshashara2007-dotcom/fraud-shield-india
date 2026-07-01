export const SCAM_COLORS: Record<string, string> = {
  "UPI": "#FF2D55",
  "UPI Fraud": "#FF2D55",
  "KYC": "#FF9500",
  "KYC Scam": "#FF9500",
  "Job": "#007AFF",
  "Job Scam": "#007AFF",
  "Lottery": "#FFD700",
  "Lottery Scam": "#FFD700",
  "Police": "#8B00FF",
  "Fake Police": "#8B00FF",
  "Bank": "#FF6B6B",
  "Fake Bank SMS": "#FF6B6B",
  "Delivery": "#00C853",
  "Fake Delivery": "#00C853",
  "Investment": "#FF69B4",
  "Investment Scam": "#FF69B4",
  "Phone": "#00CED1",
  "Phone Scam": "#00CED1",
  "Link": "#8899aa",
  "OTP": "#B24BF3",
  "Other": "#8899aa",
};

export function colorFor(type: string): string {
  return SCAM_COLORS[type] ?? "#8899aa";
}
