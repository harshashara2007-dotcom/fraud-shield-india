import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, stripJsonFences } from "./ai-gateway.server";

const VISION_MODEL = "google/gemini-2.5-flash";
const TEXT_MODEL = "google/gemini-2.5-flash";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

async function callJson(prompt: string, system: string) {
  const g = gateway();
  const { text } = await generateText({
    model: g(TEXT_MODEL),
    system,
    prompt,
  });
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    return { verdict: "SUSPICIOUS", reason: text.slice(0, 240), trustScore: 5 };
  }
}

const SYS = "You are ScanScam, India's #1 fraud detection AI. Always respond with ONLY a valid JSON object — no prose, no markdown fences. Be specific to Indian financial scams.";

// 1. QR analysis
export const analyzeQr = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ qrData: z.string().min(1).max(2000) }).parse(input))
  .handler(async ({ data }) => {
    const out = await callJson(
      `Analyze this QR code content for fraud risk: "${data.qrData}".\nReturn JSON: {"verdict":"SAFE|SUSPICIOUS|DANGER","url":"...","domainAge":"...","ssl":"valid|invalid|unknown","blacklisted":"Yes (n reports)|No","upiName":"if UPI QR else empty","trustScore":1-10,"reason":"one sentence"}`,
      SYS,
    );
    return out;
  });

// 2. UPI analysis
export const analyzeUpi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ upiId: z.string().min(3).max(120) }).parse(input))
  .handler(async ({ data }) => {
    return callJson(
      `Analyze this Indian UPI ID: "${data.upiId}". Check format validity, infer bank from suffix (@ybl=PhonePe, @paytm=Paytm, @oksbi=SBI, @okhdfcbank=HDFC, @okicici=ICICI, @okaxis=Axis, @upi=NPCI). Estimate scam risk based on patterns like 'refund', 'lottery', 'kyc', 'support' in handle.\nReturn JSON: {"verdict":"SAFE|SUSPICIOUS|DANGER","name":"likely account name","bank":"...","city":"if guessable else Unknown","trustScore":1-10,"firstSeen":"approx duration","reason":"one sentence"}`,
      SYS,
    );
  });

// 3. Phone analysis
export const analyzeCall = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ phone: z.string().min(6).max(20) }).parse(input))
  .handler(async ({ data }) => {
    return callJson(
      `Analyze this Indian phone number: "${data.phone}". Infer operator from prefix (Jio 6/7/8/9-series, Airtel, Vi, BSNL) and likely state/circle. Flag spam patterns (sequential digits, repeating, known fraud series).\nReturn JSON: {"verdict":"SAFE|SUSPICIOUS|DANGER","type":"category","operator":"Airtel|Jio|Vi|BSNL|Unknown","location":"city, state","aiVoice":true|false,"trustScore":1-10,"warning":"one sentence"}`,
      SYS,
    );
  });

// 4. Screenshot vision analysis
export const analyzeScreenshot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ imageDataUrl: z.string().startsWith("data:image/").max(8_000_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const g = gateway();
    const { text } = await generateText({
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
  .inputValidator((input: unknown) => z.object({ messages: z.array(ChatMessage).max(40) }).parse(input))
  .handler(async ({ data }) => {
    const g = gateway();
    const { text } = await generateText({
      model: g(TEXT_MODEL),
      system:
        "You are SafeBot 🛡️, India's most trusted cybersecurity assistant. You help Indians avoid UPI fraud, scam calls, fake KYC, phishing, lottery and job scams. Reply in simple English mixed with common Hindi words (Hinglish). Maximum 2-3 sentences. Be direct, friendly, and always end with a safety tip emoji like 🛡️ or ⚠️ or ✅.",
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    return { reply: text };
  });

// 6. Deepfake detection (vision)
export const analyzeDeepfake = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ imageDataUrl: z.string().startsWith("data:image/").max(8_000_000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const g = gateway();
    const { text } = await generateText({
      model: g(VISION_MODEL),
      system: SYS,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a deepfake detection AI for India. Analyze this image/video frame carefully for signs of AI manipulation: unnatural facial boundaries/blending, inconsistent lighting between face and background, blur or artifacts around hair and ears, unnatural skin smoothness, eye reflection inconsistencies, asymmetric facial features.\nReturn ONLY JSON: {"verdict":"FAKE|REAL|UNCERTAIN","confidence":0-100,"eyeBlink":"NATURAL|UNNATURAL|UNKNOWN","facialBoundary":"CONSISTENT|INCONSISTENT","lighting":"NATURAL|SUSPICIOUS","lipSync":"SYNCED|MISMATCH|UNKNOWN","metadata":"ORIGINAL|SUSPICIOUS","audioAnalysis":"NATURAL|SUSPICIOUS|UNKNOWN","explanation":"one short paragraph in simple English","whatToDo":"clear next step"}`,
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
