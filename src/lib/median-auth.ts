/**
 * Median (WebView app wrapper) native Google Sign-In bridge.
 *
 * Inside the Median native app the browser OAuth redirect flow breaks with
 * "State verification failed" because the in-app browser and the WebView do not
 * share the OAuth state. Median exposes a native plugin instead:
 *
 *   median.socialLogin.google.login({ callback: fn })
 *
 * Per Median's Social Login JavaScript Callback docs the callback receives an
 * object shaped roughly like:
 *   { event: "socialLogin", provider: "google", success: true,
 *     idToken: "...", accessToken: "...", email: "...", name: "...", error: "..." }
 *
 * Field naming has varied across Median versions (idToken / id_token /
 * identityToken), so we read all known spellings defensively.
 */

export type MedianSocialLoginResponse = {
  event?: string;
  provider?: string;
  success?: boolean;
  error?: string | null;
  cancelled?: boolean;
  canceled?: boolean;
  idToken?: string;
  id_token?: string;
  identityToken?: string;
  accessToken?: string;
  email?: string;
  name?: string;
  displayName?: string;
};

type MedianBridge = {
  socialLogin?: {
    google?: {
      login?: (opts: { callback: (response: MedianSocialLoginResponse) => void }) => void;
    };
  };
};

function bridge(): MedianBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { median?: MedianBridge; gonative?: MedianBridge }).median
    ?? (window as unknown as { gonative?: MedianBridge }).gonative;
}

/** True when the page is running inside the Median native app WebView. */
export function isMedianApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.toLowerCase().indexOf("median") >= 0;
}

/** True when Median's native Google social-login plugin is actually available. */
export function hasMedianGoogleLogin(): boolean {
  return typeof bridge()?.socialLogin?.google?.login === "function";
}

export function extractIdToken(res: MedianSocialLoginResponse | undefined | null) {
  return res?.idToken ?? res?.id_token ?? res?.identityToken ?? undefined;
}

export class MedianLoginError extends Error {
  cancelled: boolean;
  constructor(message: string, cancelled = false) {
    super(message);
    this.name = "MedianLoginError";
    this.cancelled = cancelled;
  }
}

/**
 * Triggers Median's native Google sign-in and resolves with the Google ID token.
 * Rejects with a MedianLoginError carrying a user-friendly message.
 */
export function medianGoogleIdToken(timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const login = bridge()?.socialLogin?.google?.login;
    if (typeof login !== "function") {
      reject(new MedianLoginError("Google sign-in isn't available in this app version. Please update the app."));
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new MedianLoginError("Google sign-in timed out. Please try again."));
    }, timeoutMs);

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    try {
      login({
        callback: (response) => {
          const cancelled =
            response?.cancelled === true ||
            response?.canceled === true ||
            /cancel/i.test(String(response?.error ?? ""));

          if (cancelled) {
            finish(() => reject(new MedianLoginError("Google sign-in was cancelled.", true)));
            return;
          }

          if (response?.error || response?.success === false) {
            console.error("[median] google social login error:", response?.error);
            finish(() => reject(new MedianLoginError("Google sign-in failed. Please try again.")));
            return;
          }

          const idToken = extractIdToken(response);
          if (!idToken) {
            console.error("[median] google social login returned no id token:", response);
            finish(() => reject(new MedianLoginError("Google sign-in didn't return a valid token. Please try again.")));
            return;
          }

          finish(() => resolve(idToken));
        },
      });
    } catch (err) {
      console.error("[median] google social login threw:", err);
      finish(() => reject(new MedianLoginError("Google sign-in couldn't be started. Please try again.")));
    }
  });
}
