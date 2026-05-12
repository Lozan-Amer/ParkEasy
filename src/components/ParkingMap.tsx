import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";

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

export const ParkingMap = ({
  center,
  spots,
  onSpotClick,
}: {
  center: [number, number];
  spots: Spot[];
  onSpotClick?: (spot: Spot) => void;
}) => {
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const memoSpots = useMemo(() => spots, [spots]);

  return (
    <MapContainer center={center} zoom={15} className="w-full h-full" zoomControl={false}>
      <TileLayer url={tileUrl} attribution='&copy; OpenStreetMap' />
      <Recenter center={center} />
      <CircleMarker
        center={center}
        radius={8}
        pathOptions={{ color: "hsl(199 89% 55%)", fillColor: "hsl(199 89% 55%)", fillOpacity: 1, weight: 3 }}
      />
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
              <small>פג תוקף: {new Date(s.expires_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</small>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
