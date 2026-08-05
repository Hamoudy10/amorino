"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader, type Libraries } from "@react-google-maps/api";
import { Bike, MapPin } from "lucide-react";
import { CAFE_COORDS, haversineKm } from "@/lib/coords";

interface DeliveryMapProps {
  riderLat: number | null;
  riderLng: number | null;
  customerLat: number;
  customerLng: number;
  label?: string;
}

const MAP_LIBRARIES: Libraries = ["places", "geometry"];

/**
 * Live delivery map: café marker, customer marker, rider marker (when
 * broadcasting) and the driving route — from the rider once they're moving,
 * otherwise from the café.
 */
export function DeliveryMap({ riderLat, riderLng, customerLat, customerLng, label }: DeliveryMapProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "amorino-google-map",
    googleMapsApiKey: key ?? "",
    libraries: MAP_LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [, setMap] = useState<google.maps.Map | null>(null);

  const riderMoving = riderLat !== null && riderLng !== null;
  const center = riderMoving
    ? { lat: riderLat!, lng: riderLng! }
    : { lat: customerLat, lng: customerLng };

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  useEffect(() => {
    if (!isLoaded) return;
    const directionsService = new google.maps.DirectionsService();
    const origin = riderMoving
      ? { lat: riderLat!, lng: riderLng! }
      : { lat: CAFE_COORDS.lat, lng: CAFE_COORDS.lng };
    directionsService.route(
      {
        origin,
        destination: { lat: customerLat, lng: customerLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setDirections(status === google.maps.DirectionsStatus.OK ? result : null);
      }
    );
  }, [isLoaded, riderMoving, riderLat, riderLng, customerLat, customerLng]);

  const stats = useMemo(() => {
    if (!riderMoving) return null;
    const origin = { lat: riderLat!, lng: riderLng! };
    const dest = { lat: customerLat, lng: customerLng };
    const km = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
    const minutes = Math.max(1, Math.round((km / 28) * 60)); // ~28 km/h city average
    return { km: km.toFixed(1), minutes };
  }, [riderMoving, riderLat, riderLng, customerLat, customerLng]);

  if (!key) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border bg-muted p-4 text-center text-sm text-muted-foreground">
        Live map is disabled — Google Maps key not configured.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      {!isLoaded ? (
        <div className="flex h-72 w-full animate-pulse items-center justify-center bg-muted text-sm text-muted-foreground">
          Loading map…
        </div>
      ) : (
        <>
          <GoogleMap
            mapContainerClassName="h-72 w-full"
            center={center}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {/* Café */}
            <Marker
              position={{ lat: CAFE_COORDS.lat, lng: CAFE_COORDS.lng }}
              title="Amorino Café"
              label={{ text: "C", color: "#ffffff", fontSize: "12px", fontWeight: "bold" }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#d97706",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
            />
            {/* Customer */}
            <Marker
              position={{ lat: customerLat, lng: customerLng }}
              title="Delivery address"
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: "#0f766e",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
              }}
            />
            {/* Rider */}
            {riderMoving && (
              <Marker
                position={{ lat: riderLat!, lng: riderLng! }}
                title="Your rider"
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#2563eb",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
              />
            )}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-background px-4 py-2.5 text-xs">
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Bike className="h-3.5 w-3.5 text-blue-600" />
                {riderMoving ? "Rider en route" : "Rider not yet moving"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-secondary" /> Delivery point
              </span>
            </div>
            {stats ? (
              <span className="font-semibold">
                ~{stats.minutes} min · {stats.km} km away
              </span>
            ) : label ? (
              <span className="text-muted-foreground">{label}</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}