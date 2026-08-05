"use client";

import * as React from "react";
import { GoogleMap, Marker, useJsApiLoader, type Libraries } from "@react-google-maps/api";
import { Bike, RefreshCw, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types";

const LIBRARIES: Libraries = ["places", "geometry"];

interface FleetRider {
  id: string;
  name: string | null;
  phone: string | null;
  location: {
    lat: string;
    lng: string;
    accuracy: string | null;
    recordedAt: string;
  } | null;
  activeOrder: {
    orderNumber: string;
    status: string;
    deliveryAddress: string | null;
    customerName: string;
    customerPhone: string;
  } | null;
}

const ORDER_BADGE: Record<string, "default" | "success" | "secondary" | "destructive" | "outline"> = {
  out_for_delivery: "default",
  ready: "default",
  preparing: "secondary",
  confirmed: "secondary",
};

export function FleetMap() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded } = useJsApiLoader({
    id: "amorino-fleet-map",
    googleMapsApiKey: key ?? "",
    libraries: LIBRARIES,
  });

  const [riders, setRiders] = React.useState<FleetRider[] | null>(null);
  const [cafe, setCafe] = React.useState<{ lat: number; lng: number } | null>(null);

  const fetchFleet = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/locations", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setRiders(json.data.riders);
        setCafe(json.data.café);
      }
    } catch {
      // ignored
    }
  }, []);

  React.useEffect(() => {
    void fetchFleet();
    const interval = setInterval(() => void fetchFleet(), 15_000);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  const moving = (riders ?? []).filter((r) => r.location);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Rider Map</h1>
          <p className="text-sm text-muted-foreground">
            {riders === null
              ? "Loading riders…"
              : `${moving.length} of ${riders.length} riders sharing location`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void fetchFleet()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {riders === null ? (
        <Skeleton className="h-96 w-full" />
      ) : !key || !isLoaded ? (
        <div className="flex h-96 items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground">
          {key ? "Loading map…" : "Google Maps key not configured."}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <GoogleMap
              mapContainerClassName="h-96 w-full rounded-lg"
              center={cafe ?? { lat: -4.0435, lng: 39.6682 }}
              zoom={13}
            >
              {cafe && (
                <Marker
                  position={cafe}
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
              )}
              {riders.map((r) =>
                r.location ? (
                  <Marker
                    key={r.id}
                    position={{ lat: Number(r.location.lat), lng: Number(r.location.lng) }}
                    title={r.name ?? r.phone ?? "Rider"}
                    label={{
                      text: (r.name ?? "R")[0].toUpperCase(),
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: "#2563eb",
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 2,
                    }}
                  />
                ) : null
              )}
            </GoogleMap>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(riders ?? []).map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-5">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-semibold">{r.name ?? r.phone ?? "Rider"}</p>
                {r.location ? (
                  <Badge variant="success">Live</Badge>
                ) : (
                  <Badge variant="outline">Offline</Badge>
                )}
              </div>
              {r.location ? (
                <p className="text-xs text-muted-foreground">
                  {timeAgo(r.location.recordedAt) === "just now"
                    ? "Updated just now"
                    : `Last seen ${timeAgo(r.location.recordedAt)}`}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Never shared location — rider must toggle "Share live location" on an out-for-delivery order
                </p>
              )}
              {r.activeOrder ? (
                <div className="mt-2 rounded-lg border p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{r.activeOrder.orderNumber}</span>
                    <Badge variant={ORDER_BADGE[r.activeOrder.status] ?? "outline"}>
                      {ORDER_STATUS_LABELS[r.activeOrder.status as OrderStatus]}
                    </Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{r.activeOrder.deliveryAddress ?? "—"}</span>
                  </p>
                </div>
              ) : (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Bike className="h-3 w-3" /> No active delivery
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}