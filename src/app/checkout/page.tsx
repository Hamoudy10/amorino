"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Smartphone, Banknote, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { ProgressRing } from "@/components/checkout/progress-ring";
import { Confetti } from "@/components/ui/confetti";
import { formatKES, normalizePhone } from "@/lib/utils";
import type { OrderType, PaymentMethod } from "@/types";

type Step = "form" | "submitting" | "stk" | "success" | "error";

const CAFE_COORDS = { lat: -4.0435, lng: 39.6682 };

function maskPhone(phone: string): string {
  const p = normalizePhone(phone);
  if (!/^254[17][0-9]{8}$/.test(p)) return phone;
  return `0${p.slice(3, 5)} ${p.slice(5, 7)}**${p.slice(9)}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, count, clear, tip } = useCart();

  const [step, setStep] = React.useState<Step>("form");
  const [orderNumber, setOrderNumber] = React.useState<string>("");
  const [checkoutRequestId, setCheckoutRequestId] = React.useState<string>("");
  const [errorMsg, setErrorMsg] = React.useState<string>("");

  const [form, setForm] = React.useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    type: "delivery" as OrderType,
    deliveryAddress: "",
    deliveryLat: "",
    deliveryLng: "",
    specialInstructions: "",
    paymentMethod: "mpesa" as PaymentMethod,
  });

  const [deliveryFee, setDeliveryFee] = React.useState<number | null>(null);
  const [feeStatus, setFeeStatus] = React.useState<"idle" | "calculating" | "done" | "out_of_range">("idle");
  const [switchingToCash, setSwitchingToCash] = React.useState(false);

  const total = subtotal + (deliveryFee ?? 0) + tip;

  const switchToCash = async () => {
    if (!orderNumber) return;
    setSwitchingToCash(true);
    try {
      const res = await fetch("/api/orders/switch-to-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, phone: form.customerPhone }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not switch payment method");
        return;
      }
      toast.success("Order switched to pay on delivery");
      clear();
      setStep("success");
      setTimeout(() => router.push(`/track/${orderNumber}`), 1200);
    } catch {
      toast.error("Network error");
    } finally {
      setSwitchingToCash(false);
    }
  };

  const hasGoogleMaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  React.useEffect(() => {
    if (form.type !== "delivery") {
      setFeeStatus("idle");
      setDeliveryFee(null);
      return;
    }
    const lat = Number(form.deliveryLat);
    const lng = Number(form.deliveryLng);
    if (!lat || !lng) return;
    setFeeStatus("calculating");
    const distance = haversineKm(CAFE_COORDS.lat, CAFE_COORDS.lng, lat, lng);
    // Mirror server-side rule: free within 3km, KES 100 + 50/km beyond, max 10km
    if (distance > 10) {
      setFeeStatus("out_of_range");
      setDeliveryFee(null);
      return;
    }
    const fee = distance <= 3 ? 0 : Math.round(100 + (distance - 3) * 50);
    setDeliveryFee(fee);
    setFeeStatus("done");
  }, [form.type, form.deliveryLat, form.deliveryLng]);

  // Google Places autocomplete for delivery address
  const addressRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!hasGoogleMaps || form.type !== "delivery" || !addressRef.current) return;
    let autocomplete: google.maps.places.Autocomplete | null = null;
    let unmounted = false;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.onload = () => {
      if (unmounted || !addressRef.current) return;
      autocomplete = new google.maps.places.Autocomplete(addressRef.current, {
        componentRestrictions: { country: "ke" },
        fields: ["formatted_address", "geometry"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete?.getPlace();
        if (place?.formatted_address) setForm((f) => ({ ...f, deliveryAddress: place.formatted_address ?? "" }));
        if (place?.geometry?.location) {
          setForm((f) => ({
            ...f,
            deliveryLat: String(place.geometry!.location!.lat()),
            deliveryLng: String(place.geometry!.location!.lng()),
          }));
        }
      });
    };
    document.head.appendChild(script);
    return () => {
      unmounted = true;
      document.head.removeChild(script);
      autocomplete?.unbindAll();
    };
  }, [hasGoogleMaps, form.type]);

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    if (lines.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (form.customerName.trim().length < 2) {
      toast.error("Please enter your name");
      return;
    }
    const phone = normalizePhone(form.customerPhone);
    if (!/^254[17][0-9]{8}$/.test(phone)) {
      toast.error("Enter a valid Kenyan phone number (e.g. 0712345678)");
      return;
    }
    if (form.type === "delivery" && form.deliveryAddress.trim().length < 5) {
      toast.error("Please enter a delivery address");
      return;
    }

    setStep("submitting");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim() || undefined,
          type: form.type,
          paymentMethod: form.paymentMethod,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            options: l.options,
          })),
          deliveryAddress: form.type === "delivery" ? form.deliveryAddress.trim() : undefined,
          deliveryLat: form.deliveryLat ? Number(form.deliveryLat) : undefined,
          deliveryLng: form.deliveryLng ? Number(form.deliveryLng) : undefined,
          specialInstructions: form.specialInstructions.trim() || undefined,
          tip,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setStep("error");
        setErrorMsg(json.error ?? "Could not place your order");
        return;
      }

      setOrderNumber(json.data.orderNumber);

      if (form.paymentMethod === "cash") {
        setStep("success");
        clear();
        setTimeout(() => router.push(`/track/${json.data.orderNumber}`), 1200);
        return;
      }

      // M-Pesa STK push
      const payRes = await fetch("/api/payments/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: json.data.orderNumber,
          phone: form.customerPhone.trim(),
        }),
      });
      const payJson = await payRes.json();
      if (!payJson.ok) {
        setStep("error");
        setErrorMsg(payJson.error ?? "Could not start M-Pesa payment");
        return;
      }

      setCheckoutRequestId(payJson.data.checkoutRequestId);
      setStep("stk");
      void pollPayment(payJson.data.checkoutRequestId);
    } catch {
      setStep("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const pollPayment = async (checkoutId: string) => {
    try {
      const res = await fetch(`/api/payments/status?checkoutRequestId=${encodeURIComponent(checkoutId)}`);
      const json = await res.json();
      if (!json.ok) return;
      if (json.data.status === "success") {
        setStep("success");
        clear();
        setTimeout(() => router.push(`/track/${orderNumber}`), 1200);
      } else if (json.data.status === "failed") {
        setStep("error");
        setErrorMsg("Payment failed. You can retry from the order tracking page.");
      } else {
        setTimeout(() => void pollPayment(checkoutId), 4000);
      }
    } catch {
      setTimeout(() => void pollPayment(checkoutId), 4000);
    }
  };

  if (step === "submitting" || step === "stk" || step === "success" || step === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
            {step === "submitting" && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-semibold">Placing your order…</p>
              </>
            )}
            {step === "stk" && (
              <>
                <Smartphone className="h-10 w-10 animate-pulse text-primary" />
                <h2 className="text-xl font-bold">Check your phone</h2>
                <p className="text-sm text-muted-foreground">
                  An M-Pesa payment request for{" "}
                  <span className="font-semibold text-foreground">{formatKES(total)}</span> has
                  been sent to
                </p>
                <p className="text-lg font-semibold tabular-nums tracking-wide">
                  {maskPhone(form.customerPhone)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Enter your M-Pesa PIN to complete order{" "}
                  <span className="font-semibold text-foreground">{orderNumber}</span>
                </p>
                <ProgressRing totalSeconds={300} />
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void pollPayment(checkoutRequestId)}>
                    Check payment status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void submit();
                    }}
                  >
                    Try again
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void switchToCash()}
                    disabled={switchingToCash}
                  >
                    {switchingToCash && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Pay cash on delivery
                  </Button>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/track/${orderNumber}`}>I&apos;ll check later — go to tracking</Link>
                </Button>
              </>
            )}
            {step === "success" && (
              <>
                <Confetti />
                <CheckCircle2 className="h-10 w-10 text-success" />
                <h2 className="text-xl font-bold">Order placed!</h2>
                <p className="text-sm text-muted-foreground">
                  Order <span className="font-semibold text-foreground">{orderNumber}</span> confirmed.
                  Redirecting to tracking…
                </p>
              </>
            )}
            {step === "error" && (
              <>
                <XCircle className="h-10 w-10 text-destructive" />
                <h2 className="text-xl font-bold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">{errorMsg}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setStep("form")}>Back to checkout</Button>
                  {orderNumber && form.paymentMethod === "mpesa" && (
                    <Button
                      variant="secondary"
                      onClick={() => void switchToCash()}
                      disabled={switchingToCash}
                    >
                      {switchingToCash && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Pay cash on delivery
                    </Button>
                  )}
                  {orderNumber && (
                    <Button asChild variant="outline">
                      <Link href={`/track/${orderNumber}`}>Track order</Link>
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  value={form.customerName}
                  onChange={(e) => update({ customerName: e.target.value })}
                  placeholder="e.g. Amina Hassan"
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (for M-Pesa &amp; tracking) *</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={form.customerPhone}
                  onChange={(e) => update({ customerPhone: e.target.value })}
                  placeholder="e.g. 0712345678"
                  autoComplete="tel"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The M-Pesa payment request will be sent to this number.
                </p>
              </div>
              <div>
                <Label htmlFor="email">Email (optional — for receipt)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => update({ customerEmail: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["delivery", "Delivery"],
                  ["pickup", "Pickup"],
                  ["dine_in", "Dine-in"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => update({ type: key })}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      form.type === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.type === "delivery" && (
                <div>
                  <Label htmlFor="address">Delivery address *</Label>
                  <Input
                    id="address"
                    ref={addressRef}
                    value={form.deliveryAddress}
                    onChange={(e) => update({ deliveryAddress: e.target.value })}
                    placeholder="Estate, building, street… (Mombasa)"
                  />
                  {!hasGoogleMaps && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional: add exact delivery lat/lng for live tracking &amp; fee calculation.
                    </p>
                  )}
                  {hasGoogleMaps && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Input
                        value={form.deliveryLat}
                        onChange={(e) => update({ deliveryLat: e.target.value })}
                        placeholder="Latitude (auto-filled)"
                        inputMode="decimal"
                      />
                      <Input
                        value={form.deliveryLng}
                        onChange={(e) => update({ deliveryLng: e.target.value })}
                        placeholder="Longitude (auto-filled)"
                        inputMode="decimal"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => update({ paymentMethod: "mpesa" })}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    form.paymentMethod === "mpesa"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                >
                  <Smartphone className="h-6 w-6 shrink-0 text-green-600" />
                  <span>
                    <span className="block text-sm font-semibold">M-Pesa (STK Push)</span>
                    <span className="block text-xs text-muted-foreground">Pay instantly from your phone</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => update({ paymentMethod: "cash" })}
                  className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
                    form.paymentMethod === "cash"
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                >
                  <Banknote className="h-6 w-6 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-semibold">Cash</span>
                    <span className="block text-xs text-muted-foreground">Pay on pickup/delivery</span>
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.specialInstructions}
                onChange={(e) => update({ specialInstructions: e.target.value })}
                placeholder="e.g. No onions, extra sauce, call when you arrive…"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        <div className="h-fit space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {lines.map((line) => (
                <div key={line.menuItemId} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground">
                    {line.quantity}× {line.name}
                  </span>
                  <span className="shrink-0 font-medium">{formatKES(line.price * line.quantity)}</span>
                </div>
              ))}
              <div className="my-2 border-t" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({count})</span>
                <span>{formatKES(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                {feeStatus === "out_of_range" ? (
                  <span className="font-semibold text-destructive">Outside zone</span>
                ) : deliveryFee === null ? (
                  <span className="text-muted-foreground">
                    {form.type === "delivery" ? "—" : "KES 0"}
                  </span>
                ) : (
                  <span>{deliveryFee === 0 ? "Free" : formatKES(deliveryFee)}</span>
                )}
              </div>
              {tip > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip</span>
                  <span>{formatKES(tip)}</span>
                </div>
              )}
              <div className="my-2 border-t" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatKES(total)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            size="lg"
            onClick={() => void submit()}
            disabled={feeStatus === "out_of_range"}
          >
            {form.paymentMethod === "mpesa" ? "Pay with M-Pesa" : "Place Order (Cash)"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By ordering you agree to be contacted about your order via SMS/WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}