import { useEffect, useState } from "react";

/**
 * Beautiful phased splash — hex draws, shield reveal, scan sweep,
 * name types letter-by-letter, tagline fade, loading dots, flash out.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0); // 0..10
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const steps: Array<[number, number]> = [
      [1, 0],     // dark
      [2, 500],   // hex draws
      [3, 1000],  // hex fills
      [4, 1300],  // shield fade in
      [5, 1600],  // scan sweeps
      [6, 2000],  // S letter
      [7, 2300],  // ScanScam types
      [8, 2700],  // tagline
      [9, 3000],  // loading dots
      [10, 3300], // flash + slide out
    ];
    const timers = steps.map(([p, t]) => setTimeout(() => setPhase(p), t));
    const skipT = setTimeout(() => setShowSkip(true), 1000);
    const endT = setTimeout(() => onDone(), 3600);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(skipT);
      clearTimeout(endT);
    };
  }, [onDone]);

  const letters = "ScanScam".split("");
  const outgoing = phase >= 10;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-transform duration-500"
      style={{
        background: "#0A1628",
        transform: outgoing ? "translateY(-100%)" : "translateY(0)",
      }}
    >
      {showSkip && !outgoing && (
        <button
          onClick={onDone}
          className="absolute right-4 top-4 text-xs font-semibold text-[#8899aa] hover:text-white"
        >
          Skip →
        </button>
      )}

      {/* Hex + Shield stack */}
      <div className="relative h-[140px] w-[140px]">
        {/* Hex outline (draws) */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF2D55" />
              <stop offset="100%" stopColor="#c0001e" />
            </linearGradient>
          </defs>
          <polygon
            points="50,2 93,26 93,74 50,98 7,74 7,26"
            fill={phase >= 3 ? "url(#hexGrad)" : "transparent"}
            stroke="#FF2D55"
            strokeWidth="2"
            style={{
              strokeDasharray: 400,
              strokeDashoffset: phase >= 2 ? 0 : 400,
              transition: "stroke-dashoffset 500ms ease-out, fill 300ms ease-out",
              transformOrigin: "center",
              animation: phase >= 3 && phase < 5 ? "hexPulse 500ms ease-in-out" : undefined,
              transformBox: "fill-box",
            }}
          />
          {/* Shield inside */}
          <path
            d="M50,22 L68,32 L68,54 Q68,68 50,78 Q32,68 32,54 L32,32 Z"
            fill="white"
            style={{
              opacity: phase >= 4 ? 0.95 : 0,
              transform: phase >= 4 ? "scale(1)" : "scale(0.5)",
              transformOrigin: "50px 50px",
              transformBox: "fill-box",
              transition: "opacity 300ms ease-out, transform 300ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
          {/* mid line */}
          <line
            x1="36"
            y1="50"
            x2="64"
            y2="50"
            stroke="#FF2D55"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ opacity: phase >= 4 ? 1 : 0, transition: "opacity 300ms" }}
          />
          {/* S letter */}
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fill="#FF2D55"
            fontSize="18"
            fontWeight="900"
            fontFamily="Inter, sans-serif"
            style={{
              opacity: phase >= 6 ? 1 : 0,
              transformOrigin: "50px 57px",
              transformBox: "fill-box",
              animation: phase >= 6 ? "letterPop 400ms cubic-bezier(0.16, 1, 0.3, 1)" : undefined,
            }}
          >
            S
          </text>
        </svg>

        {/* Scan line — only phase 5 */}
        {phase >= 5 && phase < 8 && (
          <div
            className="pointer-events-none absolute left-[16%] right-[16%] h-[3px] rounded-full"
            style={{
              background: "#FF2D55",
              boxShadow: "0 0 12px 2px #FF2D55, 0 0 24px 4px rgba(255,45,85,0.6)",
              animation: "scanSweep 500ms ease-in-out",
            }}
          />
        )}
      </div>

      {/* App name */}
      <h1
        className="mt-6 text-[36px] font-black tracking-tight text-white"
        aria-label="ScanScam"
      >
        {letters.map((ch, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: phase >= 7 ? 1 : 0,
              transform: phase >= 7 ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 200ms ease-out, transform 200ms ease-out",
              transitionDelay: `${i * 50}ms`,
            }}
          >
            {ch}
          </span>
        ))}
      </h1>

      {/* Tagline */}
      <p
        className="mt-2 text-sm"
        style={{
          color: "#8899aa",
          opacity: phase >= 8 ? 1 : 0,
          transform: phase >= 8 ? "translateY(0)" : "translateY(6px)",
          transition: "all 400ms ease-out",
        }}
      >
        Scan. Detect. Stay Safe.
      </p>

      {/* Loading dots */}
      <div className="mt-6 flex gap-2" style={{ opacity: phase >= 9 ? 1 : 0, transition: "opacity 200ms" }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full"
            style={{
              background: "#FF2D55",
              animation: `pulseDot 900ms ease-in-out ${i * 150}ms infinite`,
            }}
          />
        ))}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 text-[11px]" style={{ color: "#8899aa" }}>
        <span>🇮🇳 Made in India</span>
      </div>
      <span className="absolute bottom-2 right-3 text-[9px] opacity-40" style={{ color: "#8899aa" }}>
        v1.0.0
      </span>

      {/* Flash */}
      {phase === 10 && (
        <div
          className="pointer-events-none absolute inset-0 bg-white"
          style={{ animation: "flashOut 500ms ease-out" }}
        />
      )}
    </div>
  );
}

export function SplashGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = typeof window !== "undefined" && localStorage.getItem("splashShown");
    if (!seen) {
      setShow(true);
    }
    setReady(true);
  }, []);

  function done() {
    localStorage.setItem("splashShown", "true");
    setShow(false);
  }

  if (!ready) return null;
  return (
    <>
      {show && <SplashScreen onDone={done} />}
      {children}
    </>
  );
}
