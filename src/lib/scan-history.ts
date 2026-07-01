export type ScanEntry = {
  kind: "QR" | "UPI" | "Screenshot" | "Call" | "Deepfake";
  verdict: "SAFE" | "SUSPICIOUS" | "DANGER" | "UNKNOWN";
  label: string;
  at: string; // ISO
};

const KEY = "scanHistory";

export function loadScanHistory(): ScanEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addScanHistory(entry: Omit<ScanEntry, "at">) {
  try {
    const list = loadScanHistory();
    list.unshift({ ...entry, at: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 25)));
  } catch {
    /* ignore */
  }
}
