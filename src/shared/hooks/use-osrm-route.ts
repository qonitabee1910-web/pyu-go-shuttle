import { useQuery } from "@tanstack/react-query";
import { fetchOsrmRoute, type OsrmRoute } from "@/shared/utils/osrm";

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export function useOsrmRoute(
  origin: { lat: number; lng: number } | null | undefined,
  destination: { lat: number; lng: number } | null | undefined,
) {
  const enabled = !!origin && !!destination;
  return useQuery<OsrmRoute | null>({
    queryKey: [
      "osrm",
      origin ? round5(origin.lat) : null,
      origin ? round5(origin.lng) : null,
      destination ? round5(destination.lat) : null,
      destination ? round5(destination.lng) : null,
    ],
    enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
    queryFn: ({ signal }) => fetchOsrmRoute(origin!, destination!, signal),
  });
}
