"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader, type Libraries } from "@react-google-maps/api";
import { haversineKm } from "@/lib/coords";

const LIBRARIES: Libraries = ["places", "geometry"];

/**
 * Rider-side map: rider's current device position → delivery point, with
 * distance and ETA.
 */
export function RiderMap({
  customerLat,
  customerLng,
  customerAddress,
}: {
  customerLat: number;
  customerLng: number;
  customerAddress?: string | null;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "amorino-rider-map",
    googleMapsApiKey: key ?? "",
    libraries: LIBRARIES,
  });

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setPos(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!isLoaded || !pos) return;
    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: pos,
        destination: { lat: customerLat, lng: customerLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setDirections(status === google.maps.DirectionsStatus.OK ? result : null);
      }
    );
  }, [isLoaded, pos, customerLat, customerLng]);

  const stats = useMemo(() => {
    if (!pos) return null;
    const km = haversineKm(pos.lat, pos.lng, customerLat, customerLng);
    const minutes = Math.max(1, Math.round((km / 28) * 60));
    return { km: km.toFixed(1), minutes };
  }, [pos, customerLat, customerLng]);

  if (!key) return null;

  const center = pos ?? { lat: customerLat, lng: customerLng };

  return (
    <div className="overflow-hidden rounded-lg border">
      {!isLoaded ? (
        <div className="flex h-48 w-full animate-pulse items-center justify-center bg-muted text-xs text-muted-foreground">
          Loading map…
        </div>
      ) : (
        <>
          <GoogleMap
            mapContainerClassName="h-48 w-full"
            center={center}
            zoom={13}
          >
            {pos && <Marker position={pos} title="You" />}
            <Marker
              position={{ lat: customerLat, lng: customerLng }}
              title="Customer"
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#0f766e",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
            />
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
          <div className="flex items-center justify-between gap-2 border-t bg-background px-3 py-2 text-xs">
            <span className="truncate text-muted-foreground">
              {customerAddress ?? "Delivery point"}
            </span>
            {stats ? (
              <span className="shrink-0 font-semibold">
                ~{stats.minutes} min · {stats.km} km
              </span>
            ) : (
              <span className="shrink-0 text-muted-foreground">Getting position…</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}