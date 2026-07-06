import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { LocationCombobox } from "@/components/LocationCombobox";
import { supabase } from "@/integrations/supabase/client";
import { scamMeta, timeAgo } from "@/lib/format";
import type { IndiaLocation } from "@/lib/india-locations";
import { SCAM_COLORS, colorFor } from "@/lib/scan-colors";
import { MapPin, ChevronDown, ChevronUp, Megaphone } from "lucide-react";


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

function MapScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [recenter, setRecenter] = useState<[number, number] | null>(null);
  const [searchLoc, setSearchLoc] = useState<IndiaLocation | null>(null);
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

  const cityMarkers = useMemo<CityMarker[]>(() => {
    const byCity = new Map<
      string,
      { count: number; latSum: number; lngSum: number; types: Record<string, number> }
    >();
    for (const r of reports) {
      if (!r.city || r.lat == null || r.lng == null) continue;
      const e = byCity.get(r.city) ?? { count: 0, latSum: 0, lngSum: 0, types: {} };
      e.count += 1;
      e.latSum += r.lat;
      e.lngSum += r.lng;
      e.types[r.type] = (e.types[r.type] ?? 0) + 1;
      byCity.set(r.city, e);
    }
    return [...byCity.entries()]
      .map(([name, e]) => {
        const topScam =
          Object.entries(e.types).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Other";
        return {
          name,
          reports: e.count,
          lat: e.latSum / e.count,
          lng: e.lngSum / e.count,
          size: Math.min(32, 10 + Math.sqrt(e.count) * 4),
          topScam,
        };
      })
      .sort((a, b) => b.reports - a.reports);
  }, [reports]);

  const stats = useMemo(() => {
    const top = cityMarkers[0]?.name ?? "—";
    return { today: todayCount, cities: cityMarkers.length, top };
  }, [todayCount, cityMarkers]);

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
        {/* Location search + report shortcut */}
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <LocationCombobox
              value={searchLoc}
              onChange={(loc) => {
                setSearchLoc(loc);
                setRecenter([loc.lat, loc.lng]);
              }}
              placeholder="Search any city or district…"
              compact
            />
          </div>
          <Link
            to="/report"
            className="flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-white"
            aria-label="Report a scam"
          >
            <Megaphone className="h-4 w-4" /> Report
          </Link>
        </div>

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
              {cityMarkers.map((c) => (
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
              {searchLoc && (
                <CircleMarker
                  center={[searchLoc.lat, searchLoc.lng]}
                  radius={12}
                  pathOptions={{
                    color: "#FF2D55",
                    weight: 3,
                    fillColor: "#FF2D55",
                    fillOpacity: 0.25,
                    className: "scam-pulse",
                  }}
                >
                  <Tooltip permanent direction="top" offset={[0, -8]} className="city-label">
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 800, color: "#FF2D55", fontSize: 12 }}>📍 {searchLoc.city}</div>
                      <div style={{ color: "#64748B", fontSize: 10 }}>{searchLoc.state}</div>
                    </div>
                  </Tooltip>
                  <Popup className="dark-popup">
                    <div style={{ minWidth: 200, fontFamily: "Inter, sans-serif", background: "#12233d", color: "#fff", padding: 12, borderRadius: 12, border: "1px solid #1e3a5f" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#FF2D55" }}>📍 {searchLoc.city}</div>
                      <div style={{ fontSize: 12, marginTop: 4, color: "#c9d4e2" }}>{searchLoc.state}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              )}
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
          {[...cityMarkers].sort((a, b) => b.reports - a.reports).map((c, i) => (
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
