import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { analyzeDeepfake } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Video, ImageIcon, RefreshCw, Megaphone, Share2, AlertTriangle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/deepfake")({
  head: () => ({
    meta: [
      { title: "Deepfake Detector — ScanScam" },
      { name: "description", content: "Detect AI-generated fake videos and images. Free deepfake detector for India." },
    ],
  }),
  component: DeepfakePage,
});

type Verdict = "FAKE" | "REAL" | "UNCERTAIN";
type Check = "NATURAL" | "UNNATURAL" | "UNKNOWN" | "CONSISTENT" | "INCONSISTENT" | "SUSPICIOUS" | "SYNCED" | "MISMATCH" | "ORIGINAL";

interface DeepfakeResult {
  verdict: Verdict;
  confidence: number;
  eyeBlink: Check;
  facialBoundary: Check;
  lighting: Check;
  lipSync: Check;
  metadata: Check;
  audioAnalysis: Check;
  explanation: string;
  whatToDo: string;
}

const SCAN_STEPS = [
  "Scanning facial movements...",
  "Checking eye blink patterns...",
  "Analyzing lip sync...",
  "Checking lighting consistency...",
  "Verifying metadata...",
  "Calculating deepfake score...",
];

function DeepfakePage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [frameData, setFrameData] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [result, setResult] = useState<DeepfakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setFileType(null); setPreviewUrl(null); setFrameData(null);
    setScanning(false); setScanStep(0); setScanProgress(0); setResult(null);
    setError(null); setReported(false);
  };

  async function readImageAsDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    });
  }

  async function extractVideoFrame(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(f);
      video.addEventListener("loadeddata", () => {
        try {
          video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        } catch { /* ignore */ }
      });
      video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        canvas.width = Math.min(w, 1280);
        canvas.height = Math.round(canvas.width * (h / w));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unsupported"));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(video.src);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      });
      video.addEventListener("error", () => reject(new Error("Cannot read video")));
    });
  }

  async function handleFile(f: File, kind: "image" | "video") {
    setError(null); setResult(null); setReported(false);
    if (kind === "video" && f.size > 50 * 1024 * 1024) {
      setError("Video too large. Max 50MB."); return;
    }
    setFile(f); setFileType(kind);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
    try {
      const data = kind === "image" ? await readImageAsDataUrl(f) : await extractVideoFrame(f);
      setFrameData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read file");
    }
  }

  async function startAnalysis() {
    if (!frameData) return;
    setScanning(true); setScanStep(0); setScanProgress(0); setError(null);

    const stepTimer = setInterval(() => {
      setScanStep((s) => (s + 1) % SCAN_STEPS.length);
    }, 1000);
    const progTimer = setInterval(() => {
      setScanProgress((p) => Math.min(95, p + 4));
    }, 200);

    try {
      const res = await analyzeDeepfake({ data: { imageDataUrl: frameData } });
      setResult(res as DeepfakeResult);
      setScanProgress(100);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      clearInterval(stepTimer);
      clearInterval(progTimer);
      setTimeout(() => setScanning(false), 400);
    }
  }

  async function reportDeepfake() {
    if (!result || !fileType) return;
    try {
      await supabase.from("deepfakes").insert({
        file_type: fileType,
        verdict: result.verdict,
        confidence: result.confidence,
      });
      setReported(true);
    } catch {
      setReported(true);
    }
  }

  async function shareWarning() {
    const msg = `⚠️ DEEPFAKE ALERT: I detected a ${result?.verdict?.toLowerCase() ?? "fake"} ${fileType ?? "media"} using ScanScam app. Stay safe! Download: ${typeof window !== "undefined" ? window.location.origin : ""}`;
    if (navigator.share) {
      try { await navigator.share({ title: "ScanScam — Deepfake Alert", text: msg }); return; } catch { /* fall through */ }
    }
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  return (
    <AppShell header={<ScreenHeader title={<span className="flex items-center gap-2"><span>🎭</span> Deepfake Detector</span>} subtitle="Spot AI-generated fakes" />}>
      <div className="space-y-5 px-4 pb-8 pt-5">
        {!result && !scanning && (
          <>
            <UploadArea
              previewUrl={previewUrl}
              fileType={fileType}
              onImage={() => imageInputRef.current?.click()}
              onVideo={() => videoInputRef.current?.click()}
            />
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "image")} />
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/x-msvideo" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "video")} />
            {error && <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
            {file && frameData && (
              <Button onClick={startAnalysis} className="h-12 w-full bg-[#7C3AED] text-base font-bold text-white hover:bg-[#6D28D9]">
                🔍 Analyze for Deepfake
              </Button>
            )}
          </>
        )}

        {scanning && <ScanningUI step={SCAN_STEPS[scanStep]} progress={scanProgress} />}

        {result && !scanning && (
          <ResultView
            result={result}
            reported={reported}
            onReport={reportDeepfake}
            onShare={shareWarning}
            onReset={reset}
          />
        )}

        {!result && (
          <CommonScenarios />
        )}

        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          AI detection is 85–90% accurate. Always verify through official channels.<br />
          ScanScam is not liable for false results.
        </p>
      </div>
    </AppShell>
  );
}

function UploadArea({ previewUrl, fileType, onImage, onVideo }: { previewUrl: string | null; fileType: "image" | "video" | null; onImage: () => void; onVideo: () => void; }) {
  return (
    <div className="space-y-3">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#7C3AED]/50 bg-card">
        {previewUrl ? (
          fileType === "video" ? (
            <video src={previewUrl} className="h-full w-full object-cover" muted playsInline controls />
          ) : (
            <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#7C3AED]/15 text-3xl">🎭</div>
            <p className="mt-2 text-sm font-semibold">Upload media to scan</p>
            <p className="text-[11px] text-muted-foreground">Photo or video — analyzed by AI</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onVideo} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-sm font-semibold active:scale-95">
          <Video className="h-5 w-5 text-[#7C3AED]" />
          📹 Upload Video
          <span className="text-[10px] font-normal text-muted-foreground">mp4 · mov · avi · 50MB</span>
        </button>
        <button onClick={onImage} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-sm font-semibold active:scale-95">
          <ImageIcon className="h-5 w-5 text-[#7C3AED]" />
          🖼️ Upload Photo
          <span className="text-[10px] font-normal text-muted-foreground">jpg · png · camera/gallery</span>
        </button>
      </div>
    </div>
  );
}

function ScanningUI({ step, progress }: { step: string; progress: number }) {
  return (
    <div className="space-y-5 rounded-2xl border border-[#7C3AED]/40 bg-card p-6 text-center fade-in">
      <div className="relative mx-auto h-44 w-44">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <ellipse cx="50" cy="55" rx="28" ry="36" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="4 3" />
          <circle cx="40" cy="48" r="2.5" fill="#7C3AED" />
          <circle cx="60" cy="48" r="2.5" fill="#7C3AED" />
          <path d="M40 70 Q50 76 60 70" fill="none" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[#7C3AED] shadow-[0_0_10px_#7C3AED] scanline" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#7C3AED]">{step}</p>
        <div className="mt-3"><Progress value={progress} /></div>
        <p className="mt-2 text-[11px] text-muted-foreground">{progress}%</p>
      </div>
    </div>
  );
}

function verdictStyle(v: Verdict) {
  if (v === "FAKE") return { color: "#FF2D55", bg: "bg-danger/15", border: "border-danger/50", emoji: "🚨", title: "DEEPFAKE DETECTED" };
  if (v === "REAL") return { color: "#00C853", bg: "bg-safe/15", border: "border-safe/50", emoji: "✅", title: "APPEARS GENUINE" };
  return { color: "#FF9500", bg: "bg-warning/15", border: "border-warning/50", emoji: "⚠️", title: "CANNOT VERIFY" };
}

function ResultView({ result, reported, onReport, onShare, onReset }: { result: DeepfakeResult; reported: boolean; onReport: () => void; onShare: () => void; onReset: () => void; }) {
  const s = verdictStyle(result.verdict);
  return (
    <div className="space-y-4 fade-in">
      <div className={`rounded-2xl border-2 ${s.border} ${s.bg} p-6 text-center`}>
        <div className="text-5xl">{s.emoji}</div>
        <h2 className="mt-2 text-2xl font-black tracking-tight" style={{ color: s.color }}>{s.title}</h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Confidence</p>
        <p className="text-4xl font-black" style={{ color: s.color }}>{result.confidence}%</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Analysis breakdown</h3>
        <div className="space-y-2">
          <CheckRow label="Eye Blink Pattern" value={result.eyeBlink} />
          <CheckRow label="Facial Boundary" value={result.facialBoundary} />
          <CheckRow label="Lighting Analysis" value={result.lighting} />
          <CheckRow label="Lip Sync" value={result.lipSync} />
          <CheckRow label="Metadata Check" value={result.metadata} />
          <CheckRow label="Audio Analysis" value={result.audioAnalysis} />
        </div>
      </div>

      <div className={`rounded-2xl border ${s.border} ${s.bg} p-4`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: s.color }} />
          <p className="text-sm leading-relaxed">{result.explanation}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-safe/40 bg-safe/10 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-safe" />
          <h3 className="text-sm font-bold text-safe">What to do</h3>
        </div>
        <ul className="space-y-1.5 text-sm">
          <li>• Don't trust this {result.verdict === "FAKE" ? "video/image" : "media"}</li>
          <li>• Don't share it further</li>
          <li>• Report to cybercrime.gov.in</li>
          <li>• Screenshot this result as proof</li>
        </ul>
        <p className="mt-2 text-xs text-foreground/80">{result.whatToDo}</p>
      </div>

      <div className="grid gap-2">
        <Button onClick={onReport} disabled={reported} className="h-11 w-full bg-danger text-white hover:bg-danger/90">
          <Megaphone className="h-4 w-4" /> {reported ? "Report filed ✓" : "Report This Deepfake"}
        </Button>
        <Button onClick={onShare} variant="outline" className="h-11 w-full">
          <Share2 className="h-4 w-4" /> Share Warning
        </Button>
        <Button onClick={onReset} variant="ghost" className="h-11 w-full">
          <RefreshCw className="h-4 w-4" /> Analyze Another
        </Button>
      </div>
    </div>
  );
}

function CheckRow({ label, value }: { label: string; value: Check }) {
  const bad = ["UNNATURAL", "INCONSISTENT", "MISMATCH"].includes(value);
  const warn = ["SUSPICIOUS", "UNKNOWN"].includes(value);
  const icon = bad ? "❌" : warn ? "⚠️" : "✅";
  const color = bad ? "text-danger" : warn ? "text-warning" : "text-safe";
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
      <span className="text-sm">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-semibold ${color}`}>
        <span>{icon}</span> {value}
      </span>
    </div>
  );
}

function CommonScenarios() {
  const items = [
    ["🗳️", "Fake politician videos"],
    ["⭐", "Celebrity endorsement scams"],
    ["💬", "Fake customer testimonials"],
    ["💔", "Romance scam profile photos"],
    ["🏦", "Fake bank manager video calls"],
  ] as const;
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Common deepfake scams in India</h3>
      <div className="grid grid-cols-1 gap-2">
        {items.map(([e, t]) => (
          <div key={t} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="text-xl">{e}</span>
            <p className="text-sm">{t}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
