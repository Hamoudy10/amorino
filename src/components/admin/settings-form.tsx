"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import type { AppSettings } from "@/lib/settings";

const DAY_LABELS: Array<[string, string]> = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];

export function SettingsForm() {
  const [data, setData] = React.useState<AppSettings | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const json = await res.json();
        if (json.ok) setData(json.data);
      } catch {
        // ignored
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setData((d) => (d ? { ...d, [key]: value } : d));
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Save failed");
        return;
      }
      setData(json.data);
      toast.success("Settings saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Business info, delivery pricing, M-Pesa and notifications.
          </p>
        </div>
        <Button onClick={() => void save()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Business details</CardTitle>
              <CardDescription>Shown to customers across the site.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="b-name">Business name</Label>
                <Input id="b-name" value={data.business.businessName} onChange={(e) => set("business", { ...data.business, businessName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="b-phone">Phone</Label>
                <Input id="b-phone" value={data.business.phone} onChange={(e) => set("business", { ...data.business, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="b-email">Email</Label>
                <Input id="b-email" type="email" value={data.business.email} onChange={(e) => set("business", { ...data.business, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="b-address">Address</Label>
                <Input id="b-address" value={data.business.address} onChange={(e) => set("business", { ...data.business, address: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="b-maps">Google Maps link</Label>
                <Input id="b-maps" value={data.business.googleMapsLink} onChange={(e) => set("business", { ...data.business, googleMapsLink: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium">Opening hours (24h format, e.g. 07:00-23:00)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DAY_LABELS.map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Label className="w-24 shrink-0">{label}</Label>
                      <Input
                        value={data.business.openingHours[key] ?? ""}
                        onChange={(e) =>
                          set("business", {
                            ...data.business,
                            openingHours: { ...data.business.openingHours, [key]: e.target.value },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery pricing</CardTitle>
              <CardDescription>Free within the radius, then a base fee plus per-km fee up to the max distance.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <div>
                  <p className="font-medium">Delivery enabled</p>
                  <p className="text-xs text-muted-foreground">Offer delivery as an order type</p>
                </div>
                <Switch checked={data.delivery.enabled} onCheckedChange={(v) => set("delivery", { ...data.delivery, enabled: v })} />
              </div>
              <div>
                <Label htmlFor="d-free">Free delivery radius (km)</Label>
                <Input id="d-free" type="number" min={0} value={data.delivery.freeDeliveryRadiusKm} onChange={(e) => set("delivery", { ...data.delivery, freeDeliveryRadiusKm: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="d-base">Base delivery fee (KES)</Label>
                <Input id="d-base" type="number" min={0} value={data.delivery.baseDeliveryFee} onChange={(e) => set("delivery", { ...data.delivery, baseDeliveryFee: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="d-perkm">Fee per km beyond radius (KES)</Label>
                <Input id="d-perkm" type="number" min={0} value={data.delivery.extraFeePerKm} onChange={(e) => set("delivery", { ...data.delivery, extraFeePerKm: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="d-max">Max delivery distance (km)</Label>
                <Input id="d-max" type="number" min={1} value={data.delivery.maxDistanceKm} onChange={(e) => set("delivery", { ...data.delivery, maxDistanceKm: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="d-tip">Tip split to rider (%)</Label>
                <Input id="d-tip" type="number" min={0} max={100} value={data.delivery.tipSplitRiderPercent} onChange={(e) => set("delivery", { ...data.delivery, tipSplitRiderPercent: Number(e.target.value) })} />
                <p className="mt-1 text-xs text-muted-foreground">Rider&apos;s share of each tip; the rest stays with the house.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mpesa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>M-Pesa settings</CardTitle>
              <CardDescription>Credentials live in .env. Shortcode is used for the STK push display.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="m-shortcode">Shortcode / Paybill</Label>
                <Input id="m-shortcode" value={data.mpesa.shortcode} onChange={(e) => set("mpesa", { ...data.mpesa, shortcode: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">M-Pesa payments enabled</p>
                  <p className="text-xs text-muted-foreground">Allow M-Pesa at checkout</p>
                </div>
                <Switch checked={data.mpesa.enabled} onCheckedChange={(v) => set("mpesa", { ...data.mpesa, enabled: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Which channels to use when an order is placed or updated.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">SMS on new order</p>
                  <p className="text-xs text-muted-foreground">Africa&apos;s Talking SMS to the owner</p>
                </div>
                <Switch checked={data.notifications.smsOnOrder} onCheckedChange={(v) => set("notifications", { ...data.notifications, smsOnOrder: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">WhatsApp on new order</p>
                  <p className="text-xs text-muted-foreground">Meta WhatsApp template message</p>
                </div>
                <Switch checked={data.notifications.whatsappOnOrder} onCheckedChange={(v) => set("notifications", { ...data.notifications, whatsappOnOrder: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">Email receipt</p>
                  <p className="text-xs text-muted-foreground">Receipt to the customer via Resend</p>
                </div>
                <Switch checked={data.notifications.emailReceipt} onCheckedChange={(v) => set("notifications", { ...data.notifications, emailReceipt: v })} />
              </div>
              <div>
                <Label htmlFor="n-owner">Owner alert phone</Label>
                <Input id="n-owner" value={data.notifications.ownerAlertPhone} onChange={(e) => set("notifications", { ...data.notifications, ownerAlertPhone: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}