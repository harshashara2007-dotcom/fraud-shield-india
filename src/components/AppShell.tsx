import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface Props {
  children: ReactNode;
  header?: ReactNode;
  /** hide bottom nav (e.g. fullscreen camera/chat) */
  noNav?: boolean;
}

/** ScanScam mobile phone shell — max 430px, dark, centered. */
export function AppShell({ children, header, noNav = false }: Props) {
  return (
    <div className="min-h-dvh w-full bg-[#06101F] flex justify-center">
      <div className="relative flex w-full max-w-[430px] flex-col bg-background shadow-2xl shadow-black/40 min-h-dvh">
        {header}
        <main className="flex-1 fade-in">{children}</main>
        {!noNav && <BottomNav />}
      </div>
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
    >
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
