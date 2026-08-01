import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

/** hCaptcha public test sitekey — replace by setting VITE_HCAPTCHA_SITEKEY. */
const TEST_SITEKEY = "10000000-ffff-ffff-ffff-000000000001";

export function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sitekey = (import.meta.env.VITE_HCAPTCHA_SITEKEY as string | undefined) || TEST_SITEKEY;

    function render() {
      if (!ref.current || widget.current || !window.hcaptcha) return;
      widget.current = window.hcaptcha.render(ref.current, {
        sitekey,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    }

    if (window.hcaptcha) {
      render();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-hcaptcha]");
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.hcaptcha = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    script.addEventListener("error", () => setFailed(true));
    return () => script.removeEventListener("load", render);
  }, [onToken]);

  return (
    <div>
      <div ref={ref} className="min-h-[78px]" />
      {failed && (
        <p className="text-xs text-danger">
          Captcha could not load. Check your connection and reload before submitting.
        </p>
      )}
    </div>
  );
}

/** Stable, privacy-light device signature used only for abuse throttling. */
export function deviceFingerprint(): string {
  try {
    const parts = [
      navigator.userAgent,
      navigator.language,
      String(screen.width),
      String(screen.height),
      String(new Date().getTimezoneOffset()),
      String(navigator.hardwareConcurrency ?? 0),
    ];
    return parts.join("|").slice(0, 200);
  } catch {
    return "";
  }
}
