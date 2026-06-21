import { Link, useLocation } from "@tanstack/react-router";
import { Home, ScanLine, CreditCard, Map as MapIcon, Shield } from "lucide-react";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/upi", label: "UPI", icon: CreditCard },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/safety", label: "Safety", icon: Shield },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      className="sticky bottom-0 z-30 mt-auto border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = pathname === t.to || (t.to !== "/" && pathname.startsWith(t.to));
          const Icon = t.icon;
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon
                  className={`h-5 w-5 transition-transform ${active ? "text-primary scale-110" : ""}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span className={active ? "text-foreground" : ""}>{t.label}</span>
                <span
                  className={`h-1 w-1 rounded-full transition-all ${active ? "bg-primary shadow-[0_0_8px_var(--color-primary)]" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
