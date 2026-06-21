import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { safebotChat } from "@/lib/ai.functions";
import { Send, Mic, Share2, Bot, Loader2 } from "lucide-react";

export const Route = createFileRoute("/safebot")({
  head: () => ({ meta: [{ title: "SafeBot — ScanScam" }] }),
  component: SafeBotScreen,
});

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "ss_safebot_chat";
const GREETING: Msg = {
  role: "assistant",
  content: "Namaste! 🙏 I'm SafeBot, your fraud-protection buddy. Ask me anything about scams in India — UPI, KYC calls, fake jobs. Main yahan hoon! 🛡️",
};

const CHIPS = [
  "Is this UPI safe?",
  "Got a KYC call 😰",
  "Check this link",
  "How to report fraud?",
  "Fake job WhatsApp",
];

function SafeBotScreen() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch {}
    return [GREETING];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const send = useServerFn(safebotChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function submit(text?: string) {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setLoading(true);
    try {
      const { reply } = (await send({ data: { messages: next.slice(-20) } })) as { reply: string };
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error(e?.message ?? "SafeBot is offline");
      setMessages([...next, { role: "assistant", content: "Sorry, I had a hiccup. Try again? 🛡️" }]);
    } finally {
      setLoading(false);
    }
  }

  function voice() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return toast.error("Voice input not supported on this device");
    const r = new SR();
    r.lang = "en-IN";
    r.onresult = (e: any) => setInput(e.results[0][0].transcript);
    r.onerror = () => toast.error("Couldn't hear you");
    r.start();
  }

  function shareChat() {
    const text = messages.map((m) => `${m.role === "user" ? "Me" : "SafeBot"}: ${m.content}`).join("\n\n");
    if (navigator.share) navigator.share({ title: "SafeBot chat", text }).catch(() => {});
    else navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  }

  function clearChat() {
    setMessages([GREETING]);
    localStorage.removeItem(KEY);
  }

  return (
    <AppShell
      header={
        <ScreenHeader
          title={<span className="flex items-center gap-2"><Bot className="h-5 w-5 text-action" /> SafeBot</span>}
          subtitle="AI fraud help · Hinglish OK"
          right={
            <div className="flex gap-1">
              <button onClick={shareChat} className="rounded-full p-2 hover:bg-card" aria-label="Share"><Share2 className="h-4 w-4" /></button>
              <button onClick={clearChat} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          }
        />
      }
    >
      <div className="flex flex-col" style={{ height: "calc(100dvh - 180px)" }}>
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-md bg-action text-white"
                    : "rounded-bl-md bg-card text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> SafeBot is thinking…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-background px-3 py-2">
          <div className="mb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {CHIPS.map((c) => (
              <button
                key={c}
                onClick={() => submit(c)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1 text-xs"
              >
                {c}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="flex items-center gap-2"
          >
            <button type="button" onClick={voice} className="rounded-full bg-muted p-2.5" aria-label="Voice">
              <Mic className="h-4 w-4" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask SafeBot anything…"
              className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm focus:border-action focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-full bg-action p-2.5 text-white disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
