"use client";

import { useCallback, useEffect, useState } from "react";
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader, type Libraries } from "@react-google-maps/api";

interface DeliveryMapProps {
  riderLat: number | null;
  riderLng: number | null;
  customerLat: number;
  customerLng: number;
}

const MAP_LIBRARIES: Libraries = ["places", "geometry"];

export function DeliveryMap({ riderLat, riderLng, customerLat, customerLng }: DeliveryMapProps) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "amorino-google-map",
    googleMapsApiKey: key ?? "",
    libraries: MAP_LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const center = riderLat !== null && riderLng !== null ? { lat: riderLat, lng: riderLng } : { lat: customerLat, lng: customerLng };

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  useEffect(() => {
    if (!isLoaded || riderLat === null || riderLng === null) {
      setDirections(null);
      return;
    }
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: riderLat, lng: riderLng },
        destination: { lat: customerLat, lng: customerLng },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) setDirections(result);
      }
    );
  }, [isLoaded, riderLat, riderLng, customerLat, customerLng]);

  if (!key) return null;

  return (
    <div className="overflow-hidden rounded-xl border">
      {!isLoaded ? (
        <div className="flex h-72 w-full animate-pulse items-center justify-center bg-muted text-sm text-muted-foreground">
          Loading map…
        </div>
      ) : (
        <GoogleMap
          mapContainerClassName="h-72 w-full"
          center={center}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          {riderLat !== null && riderLng !== null && (
            <Marker position={{ lat: riderLat, lng: riderLng }} title="Your rider" />
          )}
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
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>
      )}
    </div>
  );
}