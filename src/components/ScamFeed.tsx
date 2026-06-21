import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { scamMeta, timeAgo } from "@/lib/format";

type Report = {
  id: string;
  type: string;
  city: string | null;
  description: string | null;
  created_at: string;
};

export function ScamFeed({ limit = 5 }: { limit?: number }) {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("scam_reports")
      .select("id,type,city,description,created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (!mounted) return;
        if (data) setItems(data as Report[]);
        setLoading(false);
      });

    const channel = supabase
      .channel("feed-scams")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scam_reports" },
        (payload) =>
          setItems((prev) => [payload.new as Report, ...prev].slice(0, limit)),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [limit]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-card/60" />
        ))}
      </div>
    );
  }
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No reports yet.</p>;

  return (
    <ul className="space-y-2">
      {items.map((r) => {
        const m = scamMeta(r.type);
        return (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="text-2xl">{m.emoji}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-semibold text-danger">
                  {m.label}
                </span>
                <span className="text-[11px] text-muted-foreground">{timeAgo(r.created_at)}</span>
              </div>
              <p className="mt-1 truncate text-sm">
                <span className="font-medium">{r.city ?? "Unknown city"}</span>
                {r.description ? <span className="text-muted-foreground"> — {r.description}</span> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
