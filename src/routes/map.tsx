import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { scamMeta, timeAgo } from "@/lib/format";
import { SCAM_COLORS, colorFor } from "@/lib/scan-colors";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

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

const FILTERS = [
  { id: "All", color: "#ffffff" },
  { id: "UPI", color: SCAM_COLORS["UPI"] },
  { id: "KYC", color: SCAM_COLORS["KYC"] },
  { id: "Job", color: SCAM_COLORS["Job"] },
  { id: "Lottery", color: SCAM_COLORS["Lottery"] },
  { id: "Phone", color: SCAM_COLORS["Phone"] },
  { id: "Link", color: SCAM_COLORS["Link"] },
] as const;

type CityMarker = {
  name: string;
  reports: number;
  lat: number;
  lng: number;
  size: number;
  topScam: string;
};

const CITY_MARKERS: CityMarker[] = [
  { name: "Delhi", reports: 234, lat: 28.6139, lng: 77.209, size: 30, topScam: "UPI Fraud" },
  { name: "Mumbai", reports: 189, lat: 19.076, lng: 72.8777, size: 30, topScam: "KYC Scam" },
  { name: "Bengaluru", reports: 156, lat: 12.9716, lng: 77.5946, size: 26, topScam: "Job Scam" },
  { name: "Hyderabad", reports: 143, lat: 17.385, lng: 78.4867, size: 24, topScam: "Phone Scam" },
  { name: "Chennai", reports: 98, lat: 13.0827, lng: 80.2707, size: 20, topScam: "UPI Fraud" },
  { name: "Kolkata", reports: 87, lat: 22.5726, lng: 88.3639, size: 20, topScam: "Lottery Scam" },
  { name: "Pune", reports: 76, lat: 18.5204, lng: 73.8567, size: 18, topScam: "Link Scam" },
  { name: "Ahmedabad", reports: 65, lat: 23.0225, lng: 72.5714, size: 16, topScam: "KYC Scam" },
  { name: "Jaipur", reports: 54, lat: 26.9124, lng: 75.7873, size: 14, topScam: "UPI Fraud" },
  { name: "Lucknow", reports: 43, lat: 26.8467, lng: 80.9462, size: 14, topScam: "Job Scam" },
];

function MapScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [recenter, setRecenter] = useState<[number, number] | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

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
        const t = (data as Report[]).filter(
          (r) => Date.now() - new Date(r.created_at).getTime() < 86400000,
        ).length;
        setTodayCount(t);
      });

    const channel = supabase
      .channel("live-fraud-map")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scam_reports" },
        (payload) => {
          const r = payload.new as Report;
          setReports((prev) => [r, ...prev]);
          setTodayCount((c) => c + 1);
          toast(`🚨 New ${scamMeta(r.type).label} in ${r.city ?? "India"}`, {
            className: "!bg-[#FF2D55] !text-white !border-none",
            duration: 4000,
          });
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const top = [...CITY_MARKERS].sort((a, b) => b.reports - a.reports)[0]?.name ?? "—";
    return { today: todayCount, cities: CITY_MARKERS.length, top };
  }, [todayCount]);

  function nearMe() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => setRecenter([pos.coords.latitude, pos.coords.longitude]),
      () => toast.error("Location permission denied"),
    );
  }

  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const filteredReports = reports.filter(
    (r) => r.lat != null && r.lng != null && (filter === "All" || r.type === filter),
  );

  return (
    <AppShell header={<ScreenHeader title="Live Fraud Map" subtitle="Realtime reports across India" />}>
      <div className="space-y-3 px-4 pb-8 pt-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300"
                style={
                  active
                    ? {
                        background: f.color,
                        color: f.id === "All" || f.color === "#FFD700" ? "#0A1628" : "#fff",
                        border: `1px solid ${f.color}`,
                      }
                    : {
                        background: "#12233d",
                        color: "#8899aa",
                        border: "1px solid #1e3a5f",
                      }
                }
              >
                {f.id !== "All" && (
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                    style={{ background: f.color }}
                  />
                )}
                {f.id}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <div className="h-[55vh] w-full overflow-hidden rounded-2xl border border-border bg-white">
            <MapContainer
              center={[22, 80]}
              zoom={5}
              minZoom={5}
              maxBounds={[[6, 67], [37, 98]]}
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
                    color: colorFor(c.topScam),
                    weight: 2,
                    fillColor: colorFor(c.topScam),
                    fillOpacity: 0.55,
                    className: "scam-pulse",
                  }}
                >
                  <Tooltip permanent direction="bottom" offset={[0, c.size / 2 + 2]} className="city-label">
                    <div style={{ textAlign: "center", lineHeight: 1.1 }}>
                      <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 12 }}>{c.name}</div>
                      <div style={{ color: "#64748B", fontSize: 10 }}>{c.reports} reports</div>
                    </div>
                  </Tooltip>
                  <Popup className="dark-popup">
                    <div style={{ minWidth: 200, fontFamily: "Inter, sans-serif", background: "#12233d", color: "#fff", padding: 12, borderRadius: 12, border: "1px solid #1e3a5f" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: colorFor(c.topScam) }}>● {c.name}</div>
                      <div style={{ fontSize: 12, marginTop: 6, color: "#c9d4e2" }}>
                        📍 {c.reports} total reports
                      </div>
                      <div style={{ fontSize: 12, marginTop: 2, color: "#c9d4e2" }}>
                        ⚠️ Top: <strong>{c.topScam}</strong>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {filteredReports.map((r) => {
                const color = colorFor(r.type);
                const isRecent = Date.now() - new Date(r.created_at).getTime() < 3600000;
                return (
                  <CircleMarker
                    key={r.id}
                    center={[r.lat!, r.lng!]}
                    radius={isRecent ? 7 : 5}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 1.5,
                      fillColor: color,
                      fillOpacity: 0.9,
                      className: isRecent ? "scam-pulse" : undefined,
                    }}
                  >
                    <Popup className="dark-popup">
                      <div style={{ minWidth: 200, fontFamily: "Inter, sans-serif", background: "#12233d", color: "#fff", padding: 12, borderRadius: 12, border: "1px solid #1e3a5f" }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color }}>
                          ● {scamMeta(r.type).label}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 6, color: "#c9d4e2" }}>📍 {r.city ?? "India"}</div>
                        <div style={{ fontSize: 12, marginTop: 2, color: "#c9d4e2" }}>⏰ {timeAgo(r.created_at)}</div>
                        {r.description && (
                          <div style={{ fontSize: 11, marginTop: 4, color: "#8899aa" }}>{r.description}</div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
              <Recenter to={recenter} />
            </MapContainer>
          </div>

          {/* Legend bottom left */}
          <div className="absolute bottom-3 left-3 z-[500]">
            <button
              onClick={() => setLegendOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card/95 px-3 py-2 text-xs font-bold shadow-lg"
            >
              🗺️ Legend {legendOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
            {legendOpen && (
              <div className="mt-2 max-h-52 w-44 overflow-auto rounded-xl border border-border bg-card p-3 shadow-xl">
                {Object.entries({
                  "UPI Fraud": SCAM_COLORS["UPI Fraud"],
                  "KYC Scam": SCAM_COLORS["KYC Scam"],
                  "Job Scam": SCAM_COLORS["Job Scam"],
                  "Lottery": SCAM_COLORS["Lottery"],
                  "Fake Police": SCAM_COLORS["Fake Police"],
                  "Fake Bank": SCAM_COLORS["Fake Bank SMS"],
                  "Fake Delivery": SCAM_COLORS["Fake Delivery"],
                  "Investment": SCAM_COLORS["Investment"],
                  "Phone Scam": SCAM_COLORS["Phone Scam"],
                  "Other": SCAM_COLORS["Other"],
                }).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-2 py-0.5 text-[11px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={nearMe}
            className="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-xs font-bold shadow-lg border border-border"
          >
            <MapPin className="h-4 w-4" style={{ color: activeFilter.color }} /> Near me
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Today" value={stats.today} />
          <Stat label="Cities" value={stats.cities} />
          <Stat label="Most active" value={stats.top} small />
        </div>

        <div className="space-y-2">
          <h2 className="px-1 pt-2 text-sm font-bold">Top cities by reports</h2>
          {[...CITY_MARKERS].sort((a, b) => b.reports - a.reports).map((c, i) => (
            <div key={c.name} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
              <span className="w-8 text-sm font-bold text-muted-foreground">#{i + 1}</span>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: colorFor(c.topScam), boxShadow: `0 0 0 3px ${colorFor(c.topScam)}22` }}
              />
              <span className="flex-1 font-semibold">{c.name}</span>
              <span className="text-sm font-bold" style={{ color: colorFor(c.topScam) }}>
                {c.reports} reports
              </span>
            </div>
          ))}
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
