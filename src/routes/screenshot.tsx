import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { VerdictHero, TrustScore } from "@/components/VerdictBadge";
import { analyzeScreenshot } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Share2, RotateCcw, Loader2 } from "lucide-react";

export const Route = createFileRoute("/screenshot")({
  head: () => ({ meta: [{ title: "Screenshot Analyze — ScanScam" }] }),
  component: ScreenshotScreen,
});

type Result = {
  verdict: "SCAM" | "SUSPICIOUS" | "SAFE";
  confidence: number;
  type: string;
  impersonating?: string;
  suspiciousElements?: string[];
  explanation: string;
  whatToDo: string;
};

function ScreenshotScreen() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const analyze = useServerFn(analyzeScreenshot);
  const nav = useNavigate();

  async function handleFile(file: File) {
    if (file.size > 6_000_000) return toast.error("Image too large (max 6 MB)");
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  }

  async function run() {
    if (!imageData) return;
    setLoading(true);
    try {
      const r = (await analyze({ data: { imageDataUrl: imageData } })) as Result;
      setResult(r);
      if (r.verdict === "SCAM") navigator.vibrate?.([200, 100, 200, 100, 200]);
    } catch (e: any) {
      toast.error(e?.message ?? "AI analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function reportAndStore() {
    if (!imageData || !result) return;
    try {
      // upload to storage (signed)
      const blob = await (await fetch(imageData)).blob();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      await supabase.storage.from("scam-screenshots").upload(path, blob, {
        contentType: blob.type || "image/jpeg",
      });
      await supabase.from("scam_reports").insert({
        type: result.type || "Link",
        description: result.explanation.slice(0, 280),
        screenshot_url: path,
      });
      toast.success("Reported to community 🛡️");
      nav({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Report failed");
    }
  }

  function shareWarning() {
    const text = `⚠️ SCAM ALERT: ${result?.type ?? "fraud"} detected. ${result?.explanation ?? ""} Stay safe! - ScanScam App`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (navigator.share) navigator.share({ title: "ScanScam alert", text }).catch(() => window.open(url));
    else window.open(url, "_blank");
  }

  function reset() {
    setImageData(null);
    setResult(null);
  }

  return (
    <AppShell header={<ScreenHeader title="Screenshot Analyze" subtitle="AI vision · WhatsApp / SMS / web" />}>
      <div className="space-y-4 px-4 pb-8 pt-4">
        {!imageData && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center text-muted-foreground hover:border-action active:scale-[0.99]">
            <Upload className="h-10 w-10" />
            <p className="text-sm font-bold text-foreground">Upload a screenshot</p>
            <p className="text-xs">PNG or JPG from gallery / camera</p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
        )}

        {imageData && !result && (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <img src={imageData} alt="preview" className="max-h-[55vh] w-full object-contain" />
            </div>
            <button
              onClick={run}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "🔍"}
              {loading ? "AI is reading the image…" : "Analyze with AI"}
            </button>
            <button
              onClick={reset}
              className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold"
            >
              Choose different image
            </button>
          </>
        )}

        {result && (
          <div className="space-y-3 fade-in">
            <VerdictHero verdict={result.verdict} sub={`${result.type}${result.impersonating ? ` · impersonating ${result.impersonating}` : ""}`} />
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">AI confidence</p>
              <TrustScore score={Math.round((result.confidence ?? 0) / 10)} />
              <p className="mt-1 text-right text-xs text-muted-foreground">{result.confidence}%</p>
            </div>
            {result.suspiciousElements?.length ? (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Red flags</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.suspiciousElements.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-danger/40 bg-danger/10 px-2 py-1 text-xs font-medium text-danger"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Why</p>
              <p className="mt-1 text-sm">{result.explanation}</p>
            </div>
            <div className="rounded-xl border-2 border-safe/40 bg-safe/10 p-4">
              <p className="text-xs font-semibold uppercase text-safe">What to do</p>
              <p className="mt-1 text-sm">{result.whatToDo}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={shareWarning}
                className="flex items-center justify-center gap-2 rounded-xl bg-action py-3 text-sm font-bold text-white active:scale-[0.98]"
              >
                <Share2 className="h-4 w-4" /> Share warning
              </button>
              <button
                onClick={reportAndStore}
                className="rounded-xl bg-danger py-3 text-sm font-bold text-white active:scale-[0.98]"
              >
                Report
              </button>
            </div>
            <button onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold">
              <RotateCcw className="h-4 w-4" /> Analyze another
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
