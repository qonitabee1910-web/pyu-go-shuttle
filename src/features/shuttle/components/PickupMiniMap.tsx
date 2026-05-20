import { MapView } from "@/shared/components/MapView";
import { KNO_AIRPORT } from "@/shared/types/shuttle";

export function PickupMiniMap({
  lat,
  lng,
  zoom = 11,
  className = "h-32 w-full",
}: {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}) {
  const center: [number, number] = [
    (lat + KNO_AIRPORT.lat) / 2,
    (lng + KNO_AIRPORT.lng) / 2,
  ];
  return (
    <MapView
      center={center}
      zoom={zoom}
      className={className}
      airportIndex={1}
      highlightIndex={0}
      points={[
        { lat, lng, label: "Jemput" },
        { lat: KNO_AIRPORT.lat, lng: KNO_AIRPORT.lng, label: "KNO" },
      ]}
      route={[
        [lat, lng],
        [KNO_AIRPORT.lat, KNO_AIRPORT.lng],
      ]}
    />
  );
}
