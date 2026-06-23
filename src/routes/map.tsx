import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { scamMeta, timeAgo } from "@/lib/format";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Live Fraud Map — ScanScam" }] }),
  ssr: false,
  component: MapScreen,
});

type Report = {
  id: string;
  type: string;
  city: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

const FILTERS = ["All", "UPI", "KYC", "Job", "Lottery", "Phone", "Link"] as const;

function MapScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [recenter, setRecenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("scam_reports")
      .select("id,type,city,description,lat,lng,created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (!mounted || !data) return;
        setReports(data as Report[]);
      });

    const channel = supabase
      .channel("map-scams")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scam_reports" },
        (payload) => {
          const r = payload.new as Report;
          setReports((prev) => [r, ...prev]);
          toast(`🚨 New scam in ${r.city ?? "India"}`, { description: scamMeta(r.type).label });
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const today = reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86400000).length;
    const counts = new Map<string, number>();
    reports.forEach((r) => r.city && counts.set(r.city, (counts.get(r.city) ?? 0) + 1));
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return {
      today,
      cities: counts.size,
      top: sorted[0]?.[0] ?? "—",
      topCities: sorted.slice(0, 10).map(([city, count]) => ({ city, count })),
    };
  }, [reports]);

  const visible = useMemo(
    () => reports.filter((r) => r.lat != null && r.lng != null && (filter === "All" || r.type === filter)),
    [reports, filter],
  );

  function nearMe() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => setRecenter([pos.coords.latitude, pos.coords.longitude]),
      () => toast.error("Location permission denied"),
    );
  }

  return (
    <AppShell header={<ScreenHeader title="Live Fraud Map" subtitle="Realtime reports across India" />}>
      <div className="space-y-3 px-4 pb-8 pt-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === f ? "bg-primary text-white" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="h-[55vh] w-full overflow-hidden rounded-2xl border border-border bg-[#071221]">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              scrollWheelZoom
              style={{ height: "100%", width: "100%", background: "#071221" }}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                subdomains={["a", "b", "c", "d"]}
                maxZoom={19}
              />
              {visible.map((r) => {
                const isWarn = r.type === "Lottery" || r.type === "KYC";
                const color = isWarn ? "#FF9500" : "#FF2D55";
                return (
                  <CircleMarker
                    key={r.id}
                    center={[r.lat!, r.lng!]}
                    radius={7}
                    pathOptions={{ color: "#ffffff", weight: 1.5, fillColor: color, fillOpacity: 0.85 }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160, fontFamily: "Inter, sans-serif" }}>
                        <strong>
                          {scamMeta(r.type).emoji} {scamMeta(r.type).label}
                        </strong>
                        <br />
                        <span style={{ fontSize: 12 }}>
                          {r.city ?? ""} · {timeAgo(r.created_at)}
                        </span>
                        {r.description && (
                          <>
                            <br />
                            <span style={{ fontSize: 12, color: "#555" }}>{r.description}</span>
                          </>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              <Recenter to={recenter} />
            </MapContainer>
          </div>
          <button
            onClick={nearMe}
            className="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-xs font-bold shadow-lg border border-border"
          >
            <MapPin className="h-4 w-4 text-primary" /> Near me
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Today" value={stats.today} />
          <Stat label="Cities" value={stats.cities} />
          <Stat label="Most active" value={stats.top} small />
        </div>

        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Top cities</h2>
          {stats.topCities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reports yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {stats.topCities.map((c, i) => (
                <li
                  key={c.city}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                >
                  <span>
                    <span className="mr-2 inline-block w-5 text-muted-foreground">#{i + 1}</span>
                    {c.city}
                  </span>
                  <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">{c.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="text-center text-[10px] text-muted-foreground">
          © OpenStreetMap contributors · © CARTO
        </p>
      </div>
    </AppShell>
  );
}

function Recenter({ to }: { to: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo(to, 11);
  }, [to, map]);
  return null;
}

function Stat({ label, value, small = false }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-bold ${small ? "text-sm" : "text-xl"} truncate`}>{value}</p>
    </div>
  );
}
