// Indian formatting helpers
export function rupees(n: number): string {
  if (n == null || isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN");
}

export function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export const SCAM_TYPES = [
  { id: "UPI", label: "UPI Fraud", emoji: "💸" },
  { id: "KYC", label: "Fake KYC", emoji: "📱" },
  { id: "Job", label: "Fake Job", emoji: "💼" },
  { id: "Lottery", label: "Lottery", emoji: "🎰" },
  { id: "Police", label: "Fake Police", emoji: "👮" },
  { id: "Bank", label: "Fake Bank SMS", emoji: "🏦" },
  { id: "Delivery", label: "Fake Delivery", emoji: "📦" },
  { id: "Investment", label: "Investment", emoji: "💰" },
  { id: "Phone", label: "Scam Call", emoji: "📞" },
  { id: "Link", label: "Phishing Link", emoji: "🔗" },
  { id: "OTP", label: "OTP Fraud", emoji: "🔐" },
] as const;

export function scamMeta(type: string) {
  return SCAM_TYPES.find((t) => t.id === type) ?? { id: type, label: type, emoji: "⚠️" };
}

export const INDIAN_CITIES = [
  { city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209 },
  { city: "Mumbai", state: "Maharashtra", lat: 19.076, lng: 72.8777 },
  { city: "Bengaluru", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 },
  { city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 },
  { city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
  { city: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lng: 80.9462 },
];

export const SCAM_OF_DAY = [
  { title: "WhatsApp 'KYC update' calls", body: "Fraudsters posing as bank staff ask you to install AnyDesk for 'urgent KYC'. Banks never do KYC over phone." },
  { title: "Fake Customer Care numbers", body: "Googling a brand's helpline often shows scammer numbers. Always use the official app." },
  { title: "QR-to-receive trick", body: "If someone sends a QR to 'send you money' — refuse. Scanning a QR only DEDUCTS money." },
  { title: "Part-time job on Telegram", body: "'Like videos, earn ₹50' grows into 'invest ₹10k to unlock'. It's a recovery scam." },
  { title: "FedEx / DHL parcel scam", body: "Auto-call says your parcel has 'drugs', press 1 to talk to police. Hang up." },
  { title: "Electricity bill SMS", body: "'Pay now or power cut' link installs a remote-access APK. Never install APKs from SMS." },
  { title: "Fake matrimony refund", body: "Profile says ₹2k refund, asks to scan QR. Scanning never credits — only debits." },
];

export function scamOfDay() {
  const day = Math.floor(Date.now() / 86400000) % SCAM_OF_DAY.length;
  return SCAM_OF_DAY[day];
}
