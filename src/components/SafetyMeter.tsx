import { useEffect, useState } from "react";
import { levelColor, type SafetyResult } from "@/lib/safe-detection";

export function SafetyMeter({ result, animate = true }: { result: SafetyResult; animate?: boolean }) {
  const c = levelColor(result.level);
  const [width, setWidth] = useState(animate ? 0 : result.score);
  useEffect(() => {
    if (!animate) return setWidth(result.score);
    const id = requestAnimationFrame(() => setWidth(result.score));
    return () => cancelAnimationFrame(id);
  }, [result.score, animate]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className={c.text}>
          {c.icon} {result.level}
        </span>
        <span className={c.text}>{result.score}/100</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: c.hex }}
        />
      </div>
    </div>
  );
}
