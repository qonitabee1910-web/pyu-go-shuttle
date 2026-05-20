import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

const defaultIcon = new L.DivIcon({
  className: "",
  html: `<div class="map-marker-default"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const highlightIcon = new L.DivIcon({
  className: "",
  html: `<div class="map-marker-highlight"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const airportIcon = new L.DivIcon({
  className: "",
  html: `<div class="map-marker-airport">✈</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const makeVehicleIcon = (emoji: string) =>
  new L.DivIcon({
    className: "",
    html: `<div class="map-marker-vehicle">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

function MapAutoFit({ points, route }: { points: any[]; route?: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      if (route && route.length > 0) {
        route.forEach(p => bounds.extend(p));
      }
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [map, points, route]);
  return null;
}

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
    <div className={className + " overflow-hidden rounded-2xl border border-border shadow-inner"}>
      <style>{`
        .map-marker-default {
          width: 18px; height: 18px; border-radius: 9999px;
          background: #0770E3; border: 3px solid white;
          box-shadow: 0 4px 10px rgba(7,112,227,0.4);
        }
        .map-marker-highlight {
          width: 26px; height: 26px; border-radius: 9999px;
          background: #0770E3; border: 4px solid white;
          box-shadow: 0 0 0 2px #0770E3, 0 6px 18px rgba(7,112,227,0.55);
        }
        .map-marker-airport {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 9999px;
          background: #111827; color: white; font-size: 16px;
          border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        }
        .map-marker-vehicle {
          font-size: 28px; line-height: 1;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapAutoFit points={points} route={route} />
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
            >
              {p.label && (
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={i === highlightIndex}>
                  <span className="font-bold text-xs">{p.label}</span>
                </Tooltip>
              )}
            </Marker>
          );
        })}
        {route && route.length > 1 ? (
          <Polyline 
            positions={route} 
            pathOptions={{ color: "#0770E3", weight: 5, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }} 
          />
        ) : null}
        {traveledRoute && traveledRoute.length > 1 ? (
          <Polyline 
            positions={traveledRoute} 
            pathOptions={{ color: "#10B981", weight: 5, opacity: 0.8 }} 
          />
        ) : null}
        {showPlane && planePos ? (
          <Marker position={planePos} icon={makeVehicleIcon(vehicleEmoji)}>
            <Popup>
              <div className="text-xs font-bold">Armada Anda</div>
            </Popup>
          </Marker>
        ) : null}
      </MapContainer>
    </div>
  );
}
