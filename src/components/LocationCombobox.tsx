import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, X } from "lucide-react";
import { INDIA_LOCATIONS, type IndiaLocation } from "@/lib/india-locations";

interface Props {
  value: IndiaLocation | null;
  onChange: (loc: IndiaLocation) => void;
  placeholder?: string;
  compact?: boolean;
}

/** Searchable dropdown over every Indian city/district in `india-locations`. */
export function LocationCombobox({ value, onChange, placeholder = "Search city or district…", compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INDIA_LOCATIONS.slice(0, 60);
    return INDIA_LOCATIONS.filter(
      (l) => l.city.toLowerCase().includes(q) || l.state.toLowerCase().includes(q),
    ).slice(0, 80);
  }, [query]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm ${compact ? "py-2" : "py-3"}`}
      >
        <MapPin className="h-4 w-4 shrink-0 text-action" />
        <span className="min-w-0 flex-1 truncate">
          {value ? (
            <>
              <span className="font-semibold">{value.city}</span>
              <span className="text-muted-foreground">, {value.state}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <Search className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a city or district…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <ul className="max-h-64 overflow-auto">
            {results.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">No matches</li>
            )}
            {results.map((r) => (
              <li key={`${r.city}|${r.state}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{r.city}</span>
                    <span className="text-muted-foreground"> · {r.state}</span>
                  </span>
                  {value?.city === r.city && value?.state === r.state && (
                    <span className="text-xs text-safe">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
            {INDIA_LOCATIONS.length.toLocaleString("en-IN")} cities & districts across India
          </div>
        </div>
      )}
    </div>
  );
}
