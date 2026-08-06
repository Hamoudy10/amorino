import { z } from "zod";

export const phoneSchema = z
  .string()
  .min(10)
  .max(15)
  .regex(/^(\+?254|0)?[17][0-9]{8}$/, "Enter a valid Kenyan phone number (e.g. 0712345678)");

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  options: z
    .array(z.object({ name: z.string().max(80), price: z.number().min(0).max(100000) }))
    .optional()
    .default([]),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerPhone: phoneSchema,
  customerEmail: z.string().email().optional().or(z.literal("")).optional(),
  type: z.enum(["delivery", "pickup", "dine_in"]),
  items: z.array(orderItemSchema).min(1).max(50),
  deliveryAddress: z.string().max(500).optional(),
  deliveryLat: z.number().min(-90).max(90).optional(),
  deliveryLng: z.number().min(-180).max(180).optional(),
  specialInstructions: z.string().max(1000).optional(),
  paymentMethod: z.enum(["mpesa", "cash"]).default("mpesa"),
  tip: z.coerce.number().min(0).max(100000).default(0),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().regex(/^AMR-\d{6}$/, "Invalid order number"),
  phone: phoneSchema,
});

export const createReviewSchema = z.object({
  orderNumber: z.string().regex(/^AMR-\d{6}$/, "Invalid order number"),
  phone: phoneSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().default(""),
});

export const createComplaintSchema = z.object({
  orderNumber: z.string().regex(/^AMR-\d{6}$/, "Invalid order number").optional(),
  phone: phoneSchema,
  category: z.enum(["missing_item", "wrong_item", "late_delivery", "quality", "payment", "other"]),
  description: z.string().min(5).max(2000),
});

export const mpesaInitiateSchema = z.object({
  orderNumber: z.string().regex(/^AMR-\d{6}$/, "Invalid order number"),
  phone: phoneSchema,
});

export const mpesaStatusSchema = z.object({
  checkoutRequestId: z.string().min(1),
});

export const riderLocationSchema = z.object({
  orderId: z.string().uuid().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
});

export const adminOrderUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    "paid",
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "picked_up",
    "cancelled",
  ]),
  riderId: z.string().uuid().optional().nullable(),
});

export const menuItemAdminSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid().nullable(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().positive(),
  // Relative paths (/food/...) are used for bundled photos; absolute URLs
  // for Cloudinary etc.
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  prepTimeMinutes: z.coerce.number().int().min(1).max(240).default(15),
  options: z.array(z.object({ name: z.string(), price: z.coerce.number() })).default([]),
});

export const categoryAdminSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().default(0),
  imageUrl: z.string().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const settingsUpdateSchema = z.object({
  business: z.object({
    businessName: z.string(),
    phone: z.string(),
    email: z.string().email(),
    address: z.string(),
    googleMapsLink: z.string(),
    openingHours: z.record(z.string(), z.string()),
  }),
  delivery: z.object({
    enabled: z.boolean(),
    freeDeliveryRadiusKm: z.coerce.number().min(0).max(50),
    baseDeliveryFee: z.coerce.number().min(0).max(100000),
    extraFeePerKm: z.coerce.number().min(0).max(10000),
    maxDistanceKm: z.coerce.number().min(1).max(100),
    tipSplitRiderPercent: z.coerce.number().min(0).max(100).default(80),
  }),
  mpesa: z.object({
    shortcode: z.string(),
    enabled: z.boolean(),
  }),
  notifications: z.object({
    smsOnOrder: z.boolean(),
    whatsappOnOrder: z.boolean(),
    emailReceipt: z.boolean(),
    ownerAlertPhone: z.string(),
  }),
});

export const complaintAdminSchema = z.object({
  complaintId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "escalated"]),
  assignedTo: z.string().uuid().nullable().optional(),
  resolution: z.string().max(2000).optional(),
});

export const reviewModerationSchema = z.object({
  reviewId: z.string().uuid(),
  isVisible: z.boolean(),
});

export const riderAssignmentSchema = z.object({
  orderId: z.string().uuid(),
  riderId: z.string().uuid().nullable(),
});
