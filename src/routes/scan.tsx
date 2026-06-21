import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { VerdictHero, TrustScore } from "@/components/VerdictBadge";
import { analyzeQr } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Image as ImageIcon, RotateCcw, Megaphone } from "lucide-react";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "Scan QR — ScanScam" }] }),
  component: ScanScreen,
});

type Result = {
  verdict: "SAFE" | "SUSPICIOUS" | "DANGER";
  url?: string;
  domainAge?: string;
  ssl?: string;
  blacklisted?: string;
  upiName?: string;
  trustScore?: number;
  reason?: string;
};

function ScanScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const analyze = useServerFn(analyzeQr);
  const nav = useNavigate();

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    const tick = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) {
        raf = requestAnimationFrame(tick);
        return;
      }
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const img = ctx.getImageData(0, 0, c.width, c.height);
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (code?.data) {
        setScanning(false);
        runAnalysis(code.data);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        toast.error("Camera unavailable. Try uploading instead.");
        setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  async function runAnalysis(data: string) {
    setQrData(data);
    setAnalyzing(true);
    try {
      const r = (await analyze({ data: { qrData: data } })) as Result;
      setResult(r);
      if (r.verdict === "DANGER") navigator.vibrate?.([200, 100, 200, 100, 200]);
      else if (r.verdict === "SAFE") navigator.vibrate?.(80);
    } catch (e: any) {
      toast.error(e?.message ?? "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise((r) => (img.onload = r));
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(data.data, data.width, data.height);
    URL.revokeObjectURL(url);
    if (!code?.data) {
      toast.error("No QR code found in image");
      return;
    }
    runAnalysis(code.data);
  }

  async function reportThis() {
    if (!qrData) return;
    await supabase.from("scam_reports").insert({
      type: "Link",
      link: qrData,
      description: result?.reason ?? "Reported via QR scan",
    });
    toast.success("Reported — thanks for protecting India 🛡️");
    nav({ to: "/" });
  }

  function reset() {
    setQrData(null);
    setResult(null);
    setAnalyzing(false);
    setScanning(false);
  }

  return (
    <AppShell header={<ScreenHeader title="QR Scanner" subtitle="Detect fraud in any QR code" />}>
      <div className="space-y-4 px-4 pb-8 pt-4">
        {!result && !analyzing && (
          <>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-black">
              {scanning ? (
                <>
                  <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* viewfinder brackets */}
                  <div className="pointer-events-none absolute inset-6 rounded-xl">
                    <Corner pos="tl" />
                    <Corner pos="tr" />
                    <Corner pos="bl" />
                    <Corner pos="br" />
                    <div className="scanline absolute left-3 right-3 top-3 h-0.5 rounded bg-danger shadow-[0_0_12px_var(--color-danger)]" />
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Camera className="h-14 w-14" />
                  <p className="text-sm">Tap below to start camera</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setScanning((s) => !s)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 active:scale-[0.98]"
            >
              <Camera className="h-5 w-5" />
              {scanning ? "Stop camera" : "Scan with Camera"}
            </button>

            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card py-3.5 text-sm font-bold active:scale-[0.98]">
              <ImageIcon className="h-5 w-5" />
              Upload from Gallery
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </>
        )}

        {analyzing && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-border border-t-primary" />
            <p className="text-sm font-medium">AI is analyzing the QR…</p>
            <p className="break-all px-4 text-center text-xs text-muted-foreground">{qrData}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <VerdictHero verdict={result.verdict} sub={result.reason} />
            {typeof result.trustScore === "number" && (
              <div className="rounded-xl border border-border bg-card p-4">
                <TrustScore score={result.trustScore} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <InfoBox label="Domain age" value={result.domainAge ?? "—"} />
              <InfoBox label="SSL" value={result.ssl ?? "—"} />
              <InfoBox label="Blacklisted" value={result.blacklisted ?? "—"} />
              {result.upiName && <InfoBox label="UPI name" value={result.upiName} />}
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase text-muted-foreground">QR content</p>
              <p className="mt-1 break-all text-xs">{qrData}</p>
            </div>
            <button
              onClick={reportThis}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-danger py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              <Megaphone className="h-4 w-4" /> Report this QR
            </button>
            <button
              onClick={reset}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" /> Scan another
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const m: Record<string, string> = {
    tl: "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
    tr: "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
    bl: "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
    br: "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
  };
  return <div className={`absolute h-8 w-8 border-white/90 ${m[pos]}`} />;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
