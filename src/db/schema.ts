import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Users & Roles
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique(),
  phone: text("phone").unique(),
  name: text("name"),
  email: text("email"),
  role: text("role").$type<"customer" | "owner" | "admin" | "rider">().default("customer").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu Categories & Items
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    imageUrl: text("image_url"),
    isAvailable: boolean("is_available").default(true),
    isPopular: boolean("is_popular").default(false),
    isVegetarian: boolean("is_vegetarian").default(false),
    isSpicy: boolean("is_spicy").default(false),
    prepTimeMinutes: integer("prep_time_minutes").default(15),
    options: jsonb("options").$type<{ name: string; price: number }[]>().default([]),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("menu_items_category_idx").on(table.categoryId)]
);

// Orders
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").unique().notNull(),
    userId: uuid("user_id").references(() => users.id),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    type: text("type").$type<"delivery" | "pickup" | "dine_in">().notNull(),
    status: text("status")
      .$type<
        | "pending_payment"
        | "paid"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "picked_up"
        | "cancelled"
      >()
      .default("pending_payment")
      .notNull(),
    paymentStatus: text("payment_status").$type<"pending" | "paid" | "failed" | "refunded">().default("pending"),
    paymentMethod: text("payment_method").$type<"mpesa" | "cash" | "card">().default("mpesa"),
    mpesaReceiptNumber: text("mpesa_receipt_number"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
    tip: decimal("tip", { precision: 10, scale: 2 }).default("0"),
    discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    deliveryAddress: text("delivery_address"),
    deliveryLat: decimal("delivery_lat", { precision: 10, scale: 6 }),
    deliveryLng: decimal("delivery_lng", { precision: 10, scale: 6 }),
    riderId: uuid("rider_id").references(() => users.id),
    specialInstructions: text("special_instructions"),
    estimatedReadyAt: timestamp("estimated_ready_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("orders_user_idx").on(table.userId),
    index("orders_status_idx").on(table.status),
    index("orders_created_idx").on(table.createdAt),
    index("orders_rider_idx").on(table.riderId),
    index("orders_rider_status_idx").on(table.riderId, table.status),
    index("orders_phone_idx").on(table.customerPhone),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .references(() => orders.id, { onDelete: "cascade" })
      .notNull(),
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    options: jsonb("options").$type<{ name: string; price: number }[]>().default([]),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)]
);

// Payments
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    merchantRequestId: text("merchant_request_id"),
    checkoutRequestId: text("checkout_request_id").unique(),
    phoneNumber: text("phone_number"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    status: text("status").$type<"initiated" | "success" | "failed" | "cancelled">().default("initiated"),
    resultCode: text("result_code"),
    resultDesc: text("result_desc"),
    mpesaReceiptNumber: text("mpesa_receipt_number"),
    transactionDate: timestamp("transaction_date"),
    rawCallback: jsonb("raw_callback"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("payments_order_idx").on(table.orderId),
    uniqueIndex("payments_checkout_idx").on(table.checkoutRequestId),
  ]
);

// Delivery Tracking
export const riderLocations = pgTable(
  "rider_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    riderId: uuid("rider_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    lat: decimal("lat", { precision: 10, scale: 6 }).notNull(),
    lng: decimal("lng", { precision: 10, scale: 6 }).notNull(),
    accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
    recordedAt: timestamp("recorded_at").defaultNow(),
  },
  (table) => [
    index("rider_locations_order_idx").on(table.orderId),
    index("rider_locations_recorded_idx").on(table.recordedAt),
  ]
);

// Reviews
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .references(() => orders.id, { onDelete: "cascade" })
      .unique(),
    userId: uuid("user_id").references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    isVisible: boolean("is_visible").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("reviews_order_idx").on(table.orderId)]
);

// Complaints / Support Tickets
export const complaints = pgTable(
  "complaints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id),
    phone: text("phone"),
    category: text("category").$type<
      "missing_item" | "wrong_item" | "late_delivery" | "quality" | "payment" | "other"
    >(),
    description: text("description").notNull(),
    status: text("status").$type<"open" | "in_progress" | "resolved" | "escalated">().default("open"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    resolution: text("resolution"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("complaints_order_idx").on(table.orderId),
    index("complaints_status_idx").on(table.status),
  ]
);

// Notifications
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    type: text("type").$type<"sms" | "whatsapp" | "push" | "email">(),
    channel: text("channel"),
    title: text("title"),
    body: text("body").notNull(),
    status: text("status").$type<"pending" | "sent" | "failed" | "read">().default("pending"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("notifications_user_idx").on(table.userId)]
);

// Settings (owner configurable)
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit / Activity Log
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("activity_logs_order_idx").on(table.orderId)]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type RiderLocation = typeof riderLocations.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "picked_up",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
