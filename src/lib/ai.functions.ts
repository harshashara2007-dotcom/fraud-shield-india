import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider, stripJsonFences } from "./ai-gateway.server";

const VISION_MODEL = "google/gemini-2.5-flash";
const TEXT_MODEL = "google/gemini-2.5-flash";

/** Cost, in credits, of a single AI-backed action. */
const AI_COST = 2;

/**
 * Server-side credit enforcement. Runs as the signed-in user (RLS applies), so
 * clients cannot skip it by calling the endpoint directly.
 *
 * Throws stable codes consumed by `@/lib/ai-errors`:
 * `insufficient_credits` | `credits_unavailable`.
 */
async function chargeServerCredits(supabase: unknown, reason: string) {
  const client = supabase as {
    rpc: (fn: "use_credits", args: { _amount: number; _reason: string }) => Promise<{ error: { message: string } | null }>;
  };
  const { error } = await client.rpc("use_credits", { _amount: AI_COST, _reason: reason });

  if (error) {
    if (String(error.message).includes("insufficient_credits")) {
      throw new Error("insufficient_credits");
    }
    // Log the real database error so it shows up in backend logs.
    console.error(`[ai:${reason}] credit charge failed:`, error.message);
    throw new Error("credits_unavailable");
  }
}

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    console.error("[ai] LOVABLE_API_KEY is not configured on the server");
    throw new Error("ai_config_missing");
  }
  return createLovableAiGatewayProvider(key);
}

/** Calls the model and logs any provider failure before throwing `ai_unavailable`. */
async function generateWithLogging(
  reason: string,
  args: Parameters<typeof generateText>[0],
): Promise<string> {
  try {
    const { text } = await generateText(args);
    return text;
  } catch (err) {
    console.error(
      `[ai:${reason}] model call failed:`,
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    );
    throw new Error("ai_unavailable");
  }
}

async function callJson(prompt: string, system: string, reason: string) {
  const g = gateway();
  const text = await generateWithLogging(reason, {
    model: g(TEXT_MODEL),
    system,
    prompt,
  });
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    console.warn(`[ai:${reason}] model returned non-JSON output, falling back`);
    return { verdict: "SUSPICIOUS", reason: text.slice(0, 240), trustScore: 5 };
  }
}


const SYS = "You are ScanScam, India's #1 fraud detection AI. Always respond with ONLY a valid JSON object — no prose, no markdown fences. Be specific to Indian financial scams.";


// 1. QR analysis
export const analyzeQr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ qrData: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    await chargeServerCredits(context.supabase, "qr_scan");
    const out = await callJson(
      `Analyze this QR code content for fraud risk: "${data.qrData}".\nReturn JSON: {"verdict":"SAFE|SUSPICIOUS|DANGER","url":"...","domainAge":"...","ssl":"valid|invalid|unknown","blacklisted":"Yes (n reports)|No","upiName":"if UPI QR else empty","trustScore":1-10,"reason":"one sentence"}`,
      SYS,
      "qr_scan",

    );
    return out;
  });

// 2. UPI analysis
export const analyzeUpi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ upiId: z.string().min(3).max(120) }).parse(input))
  .handler(async ({ data, context }) => {
    await chargeServerCredits(context.supabase, "upi_check");
    return callJson(
      `Analyze this Indian UPI ID: "${data.upiId}". Check format validity, infer bank from suffix (@ybl=PhonePe, @paytm=Paytm, @oksbi=SBI, @okhdfcbank=HDFC, @okicici=ICICI, @okaxis=Axis, @upi=NPCI). Estimate scam risk based on patterns like 'refund', 'lottery', 'kyc', 'support' in handle.\nReturn JSON: {"verdict":"SAFE|SUSPICIOUS|DANGER","name":"likely account name","bank":"...","city":"if guessable else Unknown","trustScore":1-10,"firstSeen":"approx duration","reason":"one sentence"}`,
      SYS,
      "upi_check",

    );
  });

// 3. Phone analysis
export const analyzeCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ phone: z.string().min(6).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    await chargeServerCredits(context.supabase, "call_check");
    return callJson(
      `Analyze this Indian phone number: "${data.phone}". Infer operator from prefix (Jio 6/7/8/9-series, Airtel, Vi, BSNL) and likely state/circle. Flag spam patterns (sequential digits, repeating, known fraud series).\nReturn JSON: {"verdict":"SAFE|SUSPICIOUS|DANGER","type":"category","operator":"Airtel|Jio|Vi|BSNL|Unknown","location":"city, state","aiVoice":true|false,"trustScore":1-10,"warning":"one sentence"}`,
      SYS,
      "call_check",

    );
  });

// 4. Screenshot vision analysis
export const analyzeScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ imageDataUrl: z.string().startsWith("data:image/").max(8_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await chargeServerCredits(context.supabase, "screenshot_scan");
    const g = gateway();
    const text = await generateWithLogging("screenshot_scan", {
      model: g(VISION_MODEL),
      system: SYS,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You see a screenshot from an Indian user. Detect scams (UPI fraud, fake KYC, phishing SMS, fake bank message, lottery, job, delivery, investment).\nReturn ONLY JSON: {"verdict":"SCAM|SUSPICIOUS|SAFE","confidence":0-100,"type":"category","impersonating":"brand or person being impersonated, or empty","suspiciousElements":["chip1","chip2"],"explanation":"2-3 sentence why","whatToDo":"clear next step for the user"}`,
            },
            { type: "image", image: data.imageDataUrl },
          ],
        },
      ],
    });

    try {
      return JSON.parse(stripJsonFences(text));
    } catch {
      return {
        verdict: "SUSPICIOUS",
        confidence: 50,
        type: "Unknown",
        impersonating: "",
        suspiciousElements: ["Could not auto-parse"],
        explanation: text.slice(0, 300),
        whatToDo: "Do not click any links. Verify with the official app.",
      };
    }
  });

// 5. SafeBot chat
const ChatMessage = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) });
export const safebotChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ messages: z.array(ChatMessage).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    await chargeServerCredits(context.supabase, "safebot_chat");
    const g = gateway();
    const text = await generateWithLogging("safebot_chat", {
      model: g(TEXT_MODEL),
      system:
        "You are SafeBot 🛡️, India's most trusted cybersecurity assistant. When analyzing a message, number or situation: clearly identify if it is SAFE (use ✅) or DANGER (use 🚨), explain WHY in 1 line, list the key indicators, and end with a short safety tip. Be reassuring when something is genuine — do not create unnecessary panic. Reply in simple Hinglish, maximum 3 sentences. Remind users that even genuine senders never ask for OTP, PIN or CVV.",
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    return { reply: text };
  });

// 6. Deepfake detection (vision) — accepts one image OR multiple video frames + optional audio stats
export const analyzeDeepfake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        imageDataUrl: z.string().startsWith("data:image/").max(8_000_000).optional(),
        frames: z.array(z.string().startsWith("data:image/").max(4_000_000)).max(14).optional(),
        mediaKind: z.enum(["image", "video"]).default("image"),
        durationSec: z.number().optional(),
        audioStats: z
          .object({
            duration: z.number(),
            rmsSegments: z.array(z.number()).max(24),
            zeroCrossingRate: z.number(),
            silenceRatio: z.number(),
            dynamicRange: z.number(),
            hasAudio: z.boolean(),
          })
          .optional(),
      })
      .refine((v) => !!v.imageDataUrl || (v.frames && v.frames.length > 0), {
        message: "Provide imageDataUrl or frames[]",
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await chargeServerCredits(context.supabase, "deepfake_scan");
    const g = gateway();
    const frames = data.frames && data.frames.length > 0 ? data.frames : [data.imageDataUrl!];
    const isVideo = data.mediaKind === "video";

    const audio = data.audioStats;
    const audioBlock = audio && audio.hasAudio
      ? `\n\nAUDIO WAVEFORM ANALYSIS (from user's device — treat as objective evidence):
- duration: ${audio.duration}s
- RMS energy per segment (12 windows, low→high): [${audio.rmsSegments.join(", ")}]
- zero-crossing rate: ${audio.zeroCrossingRate}
- silence ratio: ${audio.silenceRatio} (0=no silence, 1=all silence)
- dynamic range: ${audio.dynamicRange}
Interpret: AI-generated voices often show UNNATURALLY UNIFORM RMS (no breathing pauses, silence ratio ~0), abnormally low or robotic zero-crossing rate, and compressed dynamic range. Real human speech has bursty RMS and 0.1–0.4 silence ratio.`
      : audio && !audio.hasAudio
      ? `\n\nAUDIO: This video has no audible audio track. Weight verdict on visual cues only.`
      : "";

    const promptText = isVideo
      ? `You are an expert deepfake detection AI for India. You are given ${frames.length} sequential frames extracted from a video (in time order). Carefully compare frames for signs of AI generation or face-swap:
- Facial expressions: are blinks natural in rate and symmetry? Do micro-expressions look coherent frame-to-frame?
- Facial boundary: any warping, blurring, or seams around the jaw, hairline, ears?
- Lighting/shadow: do shadows on face match ambient lighting across frames?
- Skin texture: too smooth, plastic, waxy, or over-consistent across frames?
- Eye reflections & gaze: mismatched catch-lights, dead stare, unnatural saccades?
- Teeth/mouth: melted/duplicated teeth, warped lip corners, lip-sync drift over frames?
- Head pose vs body: does the head move independently of neck/shoulders?
- Temporal artefacts: flickering, ghosting, misaligned features between frames?
- Compression artefacts localized only to the face region?
- Background: static/looped backgrounds behind a moving face are a strong AI signal.
- Known-face check: if this looks like a public figure (Indian politician, actor, banker, RBI/SBI official), be extra strict — face-swap scams commonly use them.${audioBlock}
Weight the verdict across all ${frames.length} frames — one weird frame ≠ fake, but consistent anomalies do. Be decisive: only pick UNCERTAIN when signal is genuinely mixed. If ≥3 strong indicators point to AI, verdict is FAKE.
Return ONLY JSON: {"verdict":"FAKE|REAL|UNCERTAIN","confidence":0-100,"eyeBlink":"NATURAL|UNNATURAL|UNKNOWN","facialBoundary":"CONSISTENT|INCONSISTENT","lighting":"NATURAL|SUSPICIOUS","lipSync":"SYNCED|MISMATCH|UNKNOWN","metadata":"ORIGINAL|SUSPICIOUS","audioAnalysis":"NATURAL|SUSPICIOUS|UNKNOWN","explanation":"2-3 sentences citing SPECIFIC frame numbers and observations","whatToDo":"clear next step"}`
      : `You are a deepfake detection AI for India. Analyze this image carefully for signs of AI manipulation: unnatural facial boundaries/blending, inconsistent lighting between face and background, blur or artifacts around hair and ears, unnatural skin smoothness, eye reflection inconsistencies, asymmetric facial features, melted/duplicated teeth, mismatched pupils, GAN-typical texture patterns.
Return ONLY JSON: {"verdict":"FAKE|REAL|UNCERTAIN","confidence":0-100,"eyeBlink":"NATURAL|UNNATURAL|UNKNOWN","facialBoundary":"CONSISTENT|INCONSISTENT","lighting":"NATURAL|SUSPICIOUS","lipSync":"SYNCED|MISMATCH|UNKNOWN","metadata":"ORIGINAL|SUSPICIOUS","audioAnalysis":"NATURAL|SUSPICIOUS|UNKNOWN","explanation":"one short paragraph in simple English","whatToDo":"clear next step"}`;

    const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: promptText },
    ];
    frames.forEach((f) => content.push({ type: "image", image: f }));

    const text = await generateWithLogging("deepfake_scan", {
      model: g(VISION_MODEL),
      system: SYS,
      messages: [{ role: "user", content }],
    });

    try {
      return JSON.parse(stripJsonFences(text));
    } catch {
      return {
        verdict: "UNCERTAIN",
        confidence: 50,
        eyeBlink: "UNKNOWN",
        facialBoundary: "INCONSISTENT",
        lighting: "SUSPICIOUS",
        lipSync: "UNKNOWN",
        metadata: "SUSPICIOUS",
        audioAnalysis: "UNKNOWN",
        explanation: text.slice(0, 280),
        whatToDo: "Do not share. Verify through official channels.",
      };
    }
  });

