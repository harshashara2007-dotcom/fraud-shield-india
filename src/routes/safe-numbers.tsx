import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Search, Phone, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/safe-numbers")({
  head: () => ({ meta: [{ title: "Verified Safe Numbers — ScanScam" }] }),
  component: SafeNumbers,
});

type Row = { id: string; company_name: string; category: string; helpline_number: string };

const CATS: Record<string, string> = {
  Banks: "🏦",
  Telecom: "📱",
  Shopping: "🛒",
  Emergency: "🚑",
  Government: "🏛️",
  Transport: "🚂",
  Food: "🍔",
  Health: "💊",
};

function SafeNumbers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  useEffect(() => {
    supabase
      .from("safe_numbers")
      .select("id,company_name,category,helpline_number")
      .order("category")
      .then(({ data }) => data && setRows(data as Row[]));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(
      (r) =>
        (cat === "All" || r.category === cat) &&
        (q === "" || r.company_name.toLowerCase().includes(q.toLowerCase()) || r.helpline_number.includes(q)),
    );
  }, [rows, q, cat]);

  const cats = ["All", ...Object.keys(CATS)];

  return (
    <AppShell header={<ScreenHeader title="Safe Numbers" subtitle="Verified official helplines in India" />}>
      <div className="space-y-4 px-4 pb-8 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search bank or company name"
            className="w-full rounded-xl border border-border bg-card py-3 pl-9 pr-4 text-sm focus:border-safe focus:outline-none"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                cat === c ? "border-safe bg-safe/15 text-safe" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {c === "All" ? "All" : `${CATS[c]} ${c}`}
            </button>
          ))}
        </div>

        <ul className="space-y-2">
          {filtered.length === 0 && (
            <li className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              No matching numbers
            </li>
          )}
          {filtered.map((r) => (
            <li key={r.id} className="rounded-2xl border border-safe/30 bg-safe/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATS[r.category] ?? "✅"}</span>
                    <p className="truncate text-sm font-bold">{r.company_name}</p>
                    <span className="flex items-center gap-0.5 rounded-full bg-safe/20 px-1.5 py-0.5 text-[10px] font-bold text-safe">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-sm">{r.helpline_number}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">This is the ONLY official number</p>
                </div>
                <a
                  href={`tel:${r.helpline_number}`}
                  className="flex shrink-0 items-center gap-1 rounded-xl bg-safe px-3 py-2 text-xs font-bold text-white active:scale-95"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
