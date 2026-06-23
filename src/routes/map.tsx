import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
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

type CityMarker = {
  name: string;
  reports: number;
  lat: number;
  lng: number;
  color: string;
  size: number;
  topScam: string;
};

const CITY_MARKERS: CityMarker[] = [
  { name: "Delhi", reports: 234, lat: 28.6139, lng: 77.209, color: "#FF2D55", size: 30, topScam: "UPI Fraud" },
  { name: "Mumbai", reports: 189, lat: 19.076, lng: 72.8777, color: "#FF2D55", size: 30, topScam: "KYC Scam" },
  { name: "Bengaluru", reports: 156, lat: 12.9716, lng: 77.5946, color: "#FF2D55", size: 26, topScam: "Job Scam" },
  { name: "Hyderabad", reports: 143, lat: 17.385, lng: 78.4867, color: "#FF9500", size: 24, topScam: "Phone Scam" },
  { name: "Chennai", reports: 98, lat: 13.0827, lng: 80.2707, color: "#FF9500", size: 20, topScam: "UPI Fraud" },
  { name: "Kolkata", reports: 87, lat: 22.5726, lng: 88.3639, color: "#FF9500", size: 20, topScam: "Lottery Scam" },
  { name: "Pune", reports: 76, lat: 18.5204, lng: 73.8567, color: "#FFCC00", size: 18, topScam: "Link Scam" },
  { name: "Ahmedabad", reports: 65, lat: 23.0225, lng: 72.5714, color: "#FFCC00", size: 16, topScam: "KYC Scam" },
  { name: "Jaipur", reports: 54, lat: 26.9124, lng: 75.7873, color: "#FFCC00", size: 14, topScam: "UPI Fraud" },
  { name: "Lucknow", reports: 43, lat: 26.8467, lng: 80.9462, color: "#FFCC00", size: 14, topScam: "Job Scam" },
];

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
    const todayLive = reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86400000).length;
    const top = [...CITY_MARKERS].sort((a, b) => b.reports - a.reports)[0]?.name ?? "—";
    return { today: todayLive, cities: CITY_MARKERS.length, top };
  }, [reports]);

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
          <div className="h-[55vh] w-full overflow-hidden rounded-2xl border border-border bg-white">
            <MapContainer
              center={[22.5937, 78.9629]}
              zoom={5}
              scrollWheelZoom
              style={{ height: "100%", width: "100%", background: "#ffffff" }}
              attributionControl={false}
            >
              <TileLayer
                url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
                subdomains={["a", "b", "c", "d"]}
                maxZoom={19}
              />
              {CITY_MARKERS.map((c) => (
                <CircleMarker
                  key={c.name}
                  center={[c.lat, c.lng]}
                  radius={c.size / 2}
                  pathOptions={{
                    color: c.color,
                    weight: 2,
                    fillColor: c.color,
                    fillOpacity: 0.55,
                    className: "scam-pulse",
                  }}
                >
                  <Tooltip
                    permanent
                    direction="bottom"
                    offset={[0, c.size / 2 + 2]}
                    className="city-label"
                  >
                    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 12 }}>{c.name}</div>
                      <div style={{ color: "#64748B", fontSize: 10 }}>{c.reports} reports</div>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div style={{ minWidth: 180, fontFamily: "Inter, sans-serif" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{c.name}</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        <strong style={{ color: c.color }}>{c.reports}</strong> total reports
                      </div>
                      <div style={{ fontSize: 12, marginTop: 2, color: "#334155" }}>
                        Most common: <strong>{c.topScam}</strong>
                      </div>
                      <button
                        onClick={() => toast(`Viewing ${c.name} reports`)}
                        style={{
                          marginTop: 8,
                          width: "100%",
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: "#FF2D55",
                          color: "white",
                          fontSize: 12,
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        View Reports
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {reports
                .filter((r) => r.lat != null && r.lng != null && (filter === "All" || r.type === filter))
                .map((r) => {
                  const isWarn = r.type === "Lottery" || r.type === "KYC";
                  const color = isWarn ? "#FF9500" : "#FF2D55";
                  return (
                    <CircleMarker
                      key={r.id}
                      center={[r.lat!, r.lng!]}
                      radius={5}
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
