import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Layers, Map as MapIcon } from "lucide-react";

// Fix default icon
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export type PaymentType = "free" | "metered" | "paid_lot" | "private";

export const PAYMENT_LABEL: Record<PaymentType, string> = {
  free: "חינם",
  metered: "מטר (כחול-לבן)",
  paid_lot: "חניון בתשלום",
  private: "חניון פרטי",
};

const PAYMENT_COLOR: Record<PaymentType, string> = {
  free: "hsl(142 71% 45%)",
  metered: "hsl(217 91% 50%)",
  paid_lot: "hsl(38 92% 50%)",
  private: "hsl(280 70% 55%)",
};

const makeIcon = (payment: PaymentType) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${PAYMENT_COLOR[payment]};width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-weight:700;font-size:14px;">P</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

const clusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
  return L.divIcon({
    html: `<div style="background:linear-gradient(135deg,hsl(199 89% 48%),hsl(217 91% 50%));width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count < 10 ? 14 : 16}px;">${count}</div>`,
    className: "",
    iconSize: [size, size],
  });
};

export type Spot = {
  id: string;
  latitude: number;
  longitude: number;
  note: string | null;
  expires_at: string;
  created_at: string;
  payment_type: PaymentType;
  duration_minutes: number;
};

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

type MapStyle = "street" | "satellite";

const TILE_CONFIG: Record<MapStyle, { url: string; attribution: string; maxZoom: number; maxNativeZoom: number }> = {
  street: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap",
    maxZoom: 22,
    maxNativeZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 22,
    maxNativeZoom: 21,
  },
};

export const ParkingMap = ({
  center,
  spots,
  onSpotClick,
}: {
  center: [number, number];
  spots: Spot[];
  onSpotClick?: (spot: Spot) => void;
}) => {
  const [mapStyle, setMapStyle] = useState<MapStyle>("street");
  const memoSpots = useMemo(() => spots, [spots]);
  const tile = TILE_CONFIG[mapStyle];

  return (
    <div className="relative w-full h-full">
      <MapContainer center={center} zoom={15} maxZoom={24} className="w-full h-full" zoomControl={false}>
        <TileLayer key={mapStyle} url={tile.url} attribution={tile.attribution} maxZoom={tile.maxZoom} maxNativeZoom={tile.maxNativeZoom} />
        <Recenter center={center} />
        <CircleMarker
          center={center}
          radius={8}
          pathOptions={{ color: "hsl(199 89% 55%)", fillColor: "hsl(199 89% 55%)", fillOpacity: 1, weight: 3 }}
        />
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={50}
          iconCreateFunction={clusterIcon}
        >
          {memoSpots.map((s) => (
            <Marker
              key={s.id}
              position={[s.latitude, s.longitude]}
              icon={makeIcon(s.payment_type)}
              eventHandlers={{ click: () => onSpotClick?.(s) }}
            >
              <Popup>
                <div className="text-right" style={{ direction: "rtl", minWidth: 180 }}>
                  <strong>חניה פנויה · {PAYMENT_LABEL[s.payment_type]}</strong>
                  {s.note && <p style={{ margin: "4px 0" }}>{s.note}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <button
        onClick={() => setMapStyle((m) => (m === "street" ? "satellite" : "street"))}
        className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md shadow-[var(--shadow-elevated)] border border-white/50 rounded-full px-3 h-11 flex items-center gap-2 hover:scale-105 transition"
        aria-label="החלף סוג מפה"
      >
        {mapStyle === "street" ? <Layers className="w-4 h-4 text-foreground" /> : <MapIcon className="w-4 h-4 text-foreground" />}
        <span className="text-xs font-bold text-foreground">{mapStyle === "street" ? "לוויין" : "מפה"}</span>
      </button>
    </div>
  );
};
