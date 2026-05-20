import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";

const defaultIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#0770E3;box-shadow:0 0 0 4px white,0 4px 12px rgba(7,112,227,0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const highlightIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:9999px;background:#0770E3;box-shadow:0 0 0 5px white,0 0 0 7px #0770E3,0 6px 18px rgba(7,112,227,0.55);"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const airportIcon = new L.DivIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#111827;color:white;font-size:14px;box-shadow:0 0 0 3px white,0 4px 10px rgba(0,0,0,0.35);">✈</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const makeVehicleIcon = (emoji: string) =>
  new L.DivIcon({
    className: "",
    html: `<div style="font-size:24px;line-height:1;transform:translateY(-2px);filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3))">${emoji}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export function MapViewClient({
  center,
  zoom = 13,
  points = [],
  route,
  traveledRoute,
  className = "h-48 w-full",
  showPlane,
  planePos,
  vehicleEmoji = "✈️",
  highlightIndex,
  airportIndex,
  onPointClick,
}: {
  center: [number, number];
  zoom?: number;
  points?: { lat: number; lng: number; label?: string }[];
  route?: [number, number][];
  traveledRoute?: [number, number][];
  className?: string;
  showPlane?: boolean;
  planePos?: [number, number];
  vehicleEmoji?: string;
  highlightIndex?: number;
  airportIndex?: number;
  onPointClick?: (index: number) => void;
}) {
  return (
    <div className={className + " overflow-hidden rounded-2xl border border-border"}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p, i) => {
          const icon =
            i === airportIndex
              ? airportIcon
              : i === highlightIndex
                ? highlightIcon
                : defaultIcon;
          return (
            <Marker
              key={i}
              position={[p.lat, p.lng]}
              icon={icon}
              eventHandlers={
                onPointClick ? { click: () => onPointClick(i) } : undefined
              }
            />
          );
        })}
        {route && route.length > 1 ? (
          <Polyline positions={route} pathOptions={{ color: "#0770E3", weight: 6, opacity: 0.9 }} />
        ) : null}
        {traveledRoute && traveledRoute.length > 1 ? (
          <Polyline positions={traveledRoute} pathOptions={{ color: "#0770E3", weight: 5, opacity: 0.9 }} />
        ) : null}
        {showPlane && planePos ? <Marker position={planePos} icon={makeVehicleIcon(vehicleEmoji)} /> : null}
      </MapContainer>
    </div>
  );
}
