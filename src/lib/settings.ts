import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface DeliverySettings {
  enabled: boolean;
  freeDeliveryRadiusKm: number;
  baseDeliveryFee: number;
  extraFeePerKm: number;
  maxDistanceKm: number;
}

export interface BusinessSettings {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  googleMapsLink: string;
  openingHours: Record<string, string>;
}

export interface MpesaSettings {
  shortcode: string;
  enabled: boolean;
}

export interface NotificationSettings {
  smsOnOrder: boolean;
  whatsappOnOrder: boolean;
  emailReceipt: boolean;
  ownerAlertPhone: string;
}

export interface AppSettings {
  business: BusinessSettings;
  delivery: DeliverySettings;
  mpesa: MpesaSettings;
  notifications: NotificationSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  business: {
    businessName: "Amorino Café",
    phone: "0706090909",
    email: "hello@amorinocafe.co.ke",
    address: "Makadara Rd, Mombasa",
    googleMapsLink: "https://maps.app.goo.gl/amorino",
    openingHours: {
      mon: "07:00-23:00",
      tue: "07:00-23:00",
      wed: "07:00-23:00",
      thu: "07:00-23:00",
      fri: "07:00-23:00",
      sat: "07:00-23:00",
      sun: "07:00-23:00",
    },
  },
  delivery: {
    enabled: true,
    freeDeliveryRadiusKm: 3,
    baseDeliveryFee: 100,
    extraFeePerKm: 50,
    maxDistanceKm: 10,
  },
  mpesa: {
    shortcode: "174379",
    enabled: true,
  },
  notifications: {
    smsOnOrder: true,
    whatsappOnOrder: true,
    emailReceipt: true,
    ownerAlertPhone: "0706090909",
  },
};

let cached: AppSettings | null = null;

export async function getSettings(force = false): Promise<AppSettings> {
  if (cached && !force) return cached;
  const rows = await db.select().from(settings);
  const merged: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const row of rows) {
    if (row.key in merged) {
      (merged as unknown as Record<string, unknown>)[row.key] = row.value;
    }
  }
  cached = merged;
  return merged;
}

export async function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
  cached = null;
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(settings).set({ value: value as never, updatedAt: new Date() }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value: value as never });
  }
}

export async function seedDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await updateSetting(key as keyof AppSettings, value);
  }
}

// --- Delivery fee calculation (zone/distance based) ---

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Café location: Makadara Rd, Mombasa (approx) — re-exported client-safe copy.
export const CAFE_COORDS = { lat: -4.0435, lng: 39.6682 };

export async function calculateDeliveryFee(distanceKm: number): Promise<number> {
  const s = await getSettings();
  const d = s.delivery;
  if (!d.enabled) return 0;
  if (distanceKm <= d.freeDeliveryRadiusKm) return 0;
  if (distanceKm > d.maxDistanceKm) return -1; // out of range
  const extra = (distanceKm - d.freeDeliveryRadiusKm) * d.extraFeePerKm;
  return Math.round(d.baseDeliveryFee + extra);
}
