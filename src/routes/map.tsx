import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, ScreenHeader } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { scamMeta, timeAgo } from "@/lib/format";
import { MapPin, Loader2 } from "lucide-react";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Live Fraud Map — ScanScam" }] }),
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

declare global {
  interface Window {
    google: any;
    initScanScamMap?: () => void;
  }
}

function MapScreen() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [stats, setStats] = useState({ today: 0, cities: 0, top: "—" });
  const [topCities, setTopCities] = useState<{ city: string; count: number }[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Load reports + realtime
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

  // Stats
  useEffect(() => {
    const today = reports.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86400000).length;
    const counts = new Map<string, number>();
    reports.forEach((r) => r.city && counts.set(r.city, (counts.get(r.city) ?? 0) + 1));
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    setStats({ today, cities: counts.size, top: sorted[0]?.[0] ?? "—" });
    setTopCities(sorted.slice(0, 10).map(([city, count]) => ({ city, count })));
  }, [reports]);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey || mapReady) return;
    if (window.google?.maps) {
      setMapReady(true);
      return;
    }
    window.initScanScamMap = () => setMapReady(true);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=initScanScamMap`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, [apiKey, mapReady]);

  // Init map
  useEffect(() => {
    if (!mapReady || !mapEl.current || mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapEl.current, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 5,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0A1628" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0A1628" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#8FA3BF" }] },
        { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1E3A5F" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#071221" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E3A5F" }] },
        { featureType: "poi", stylers: [{ visibility: "off" }] },
      ],
    });
  }, [mapReady]);

  // Sync markers
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const visible = reports.filter((r) => {
      if (!r.lat || !r.lng) return false;
      if (filter === "All") return true;
      return r.type === filter;
    });
    const seen = new Set<string>();
    for (const r of visible) {
      seen.add(r.id);
      if (markersRef.current.has(r.id)) continue;
      const color = r.type === "Lottery" || r.type === "KYC" ? "#FF9500" : "#FF2D55";
      const marker = new window.google.maps.Marker({
        position: { lat: r.lat!, lng: r.lng! },
        map: mapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 0.85,
          strokeColor: "#fff",
          strokeWeight: 1.5,
        },
        title: `${r.type} · ${r.city}`,
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div style="color:#0A1628;min-width:160px;font-family:Inter,sans-serif"><strong>${scamMeta(r.type).emoji} ${scamMeta(r.type).label}</strong><br/><span style="font-size:12px">${r.city ?? ""} · ${timeAgo(r.created_at)}</span>${r.description ? `<br/><span style="font-size:12px;color:#555">${r.description}</span>` : ""}</div>`,
      });
      marker.addListener("click", () => info.open(mapRef.current, marker));
      markersRef.current.set(r.id, marker);
    }
    // Remove filtered out
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) {
        m.setMap(null);
        markersRef.current.delete(id);
      }
    }
  }, [reports, filter, mapReady]);

  function nearMe() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(11);
      },
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
          <div ref={mapEl} className="h-[55vh] w-full overflow-hidden rounded-2xl border border-border bg-card" />
          {!apiKey && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-card/95 p-6 text-center text-sm">
              <MapPin className="h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">Add your Google Maps API key</p>
              <p className="text-xs text-muted-foreground">Set VITE_GOOGLE_MAPS_API_KEY to load the live fraud map.</p>
            </div>
          )}
          {apiKey && !mapReady && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-card/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <button
            onClick={nearMe}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-2 text-xs font-bold shadow-lg border border-border"
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
          <ol className="space-y-1.5">
            {topCities.map((c, i) => (
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
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-bold ${small ? "text-sm" : "text-xl"} truncate`}>{value}</p>
    </div>
  );
}
