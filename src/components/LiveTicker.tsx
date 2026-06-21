import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";

type Report = { id: string; type: string; city: string | null; created_at: string };

export function LiveTicker() {
  const [items, setItems] = useState<Report[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("scam_reports")
      .select("id,type,city,created_at")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => mounted && data && setItems(data as Report[]));

    const channel = supabase
      .channel("ticker-scams")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scam_reports" },
        (payload) => {
          setItems((prev) => [payload.new as Report, ...prev].slice(0, 15));
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div className="overflow-hidden border-y border-border bg-card/50 py-2 text-xs text-muted-foreground">
        <div className="px-4">Loading live alerts…</div>
      </div>
    );
  }

  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-border bg-card/60 py-2">
      <div className="ticker-track flex w-max gap-8 text-xs whitespace-nowrap">
        {doubled.map((r, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-danger">🚨</span>
            <span className="font-medium">{r.city ?? "Somewhere"}</span>
            <span className="text-muted-foreground">: {r.type} reported {timeAgo(r.created_at)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
