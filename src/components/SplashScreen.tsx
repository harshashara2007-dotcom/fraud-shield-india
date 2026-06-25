import { useEffect, useState } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [flash, setFlash] = useState(false);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFlash(true), 2500);
    const t2 = setTimeout(() => setHide(true), 2800);
    const t3 = setTimeout(() => onDone(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const letters = "ScanScam".split("");

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300 ${hide ? "opacity-0" : "opacity-100"}`}
      style={{ background: "#0A1628" }}
    >
      <div className="relative h-[120px] w-[120px] splash-shield">
        <svg viewBox="0 0 100 100" className="h-full w-full splash-pulse">
          <path
            d="M50 5 L88 20 V50 C88 72 70 90 50 95 C30 90 12 72 12 50 V20 Z"
            fill="#FF2D55"
            stroke="#fff"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>
        <div
          className="splash-scan pointer-events-none absolute left-0 right-0 h-[3px]"
          style={{
            background: "#FF2D55",
            boxShadow: "0 0 12px 2px #FF2D55, 0 0 24px 4px rgba(255,45,85,0.6)",
          }}
        />
      </div>

      <h1 className="mt-6 text-[32px] font-black tracking-tight text-white" aria-label="ScanScam">
        {letters.map((ch, i) => (
          <span
            key={i}
            className="inline-block splash-letter"
            style={{ animationDelay: `${1500 + i * 60}ms` }}
          >
            {ch}
          </span>
        ))}
      </h1>

      <p
        className="mt-2 text-sm splash-tagline opacity-0"
        style={{ color: "#8899aa" }}
      >
        Scan. Detect. Stay Safe.
      </p>

      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 text-[11px]" style={{ color: "#8899aa" }}>
        <span>Made in India 🇮🇳</span>
        <span className="opacity-60">v1.0.0</span>
      </div>

      {flash && <div className="pointer-events-none absolute inset-0 splash-flash bg-white" />}
    </div>
  );
}

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState<boolean>(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && sessionStorage.getItem("splashShown");
    if (!seen) {
      setShow(true);
      sessionStorage.setItem("splashShown", "true");
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return (
    <>
      {show && <SplashScreen onDone={() => setShow(false)} />}
      {children}
    </>
  );
}
