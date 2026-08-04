# Amorino Café — Production Implementation Plan

## Online Ordering, M-Pesa Payments, Delivery Tracking & Business Analytics Platform

**Client:** Amorino Café, Mombasa (Makadara Rd)  
**Socials:** [Instagram](https://www.instagram.com/amorino_cafe/?hl=en) | [TikTok](https://www.tiktok.com/@amorinocafe)  
**Contacts:** 0706 090909 / 0754 090909  
**Hours:** 7 AM – 11 PM  
**Brand Positioning:** Home of Coastal Dishes | Famous Mandi & BBQ spot | Shawarma • Coffee • Shakes • Seafood

---

## 1. Project Goals & Success Criteria

| Goal | Success Metric |
|------|----------------|
| Customers can browse the full menu and place orders in < 60 seconds | Average order placement time |
| M-Pesa STK push payment flow | > 98% successful payment initiation |
| Real-time order status updates | Status changes visible to customer within 3 seconds |
| Delivery tracking | Customer can see rider location updated every 10–30 seconds |
| Owner dashboard | Daily sales, top items, peak hours, rider performance visible |
| Complaint management | All complaints logged, assigned, resolved, and reported |
| Reviews & ratings | Customer feedback collected and displayed |
| Notifications | SMS, WhatsApp, push, and email notifications working |

---

## 2. Recommended Tech Stack

> **Why this stack:** It is modern, type-safe, Kenya-friendly (M-Pesa), starts on generous free tiers, and can scale to 5,000+ orders/day with minimal cost.

| Layer | Technology | Free Tier Notes |
|-------|-----------|-----------------|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion | Vercel free hobby tier (good for launch) |
| **Backend** | Next.js API Routes + Server Actions + Edge Functions | Same Vercel deployment |
| **Database** | PostgreSQL via **Supabase** or **Neon** | Supabase free: 500 MB DB, 2 GB egress. Neon free: 500 MB storage. |
| **ORM** | Drizzle ORM | Type-safe, fast, works with edge functions |
| **Auth** | Clerk.dev free tier or NextAuth.js + Supabase Auth | Clerk is easier for roles (customer / owner / rider) |
| **Real-time** | Supabase Realtime or Ably | Supabase Realtime free with DB. Ably has generous free tier. |
| **Cache / Session** | Upstash Redis | 10k commands/day free (upgrade for scale) |
| **Queue / Jobs** | Upstash QStash or Inngest | Handles M-Pesa callbacks, SMS, email, WhatsApp sending |
| **Payments** | Safaricom M-Pesa Daraja API (STK Push + C2B) | Official Kenya payments |
| **Maps** | Google Maps Platform | $200 free monthly credit covers 5k+ orders easily |
| **WhatsApp** | WhatsApp Cloud API via Meta + Twilio fallback | Use click-to-chat for free; Cloud API for programmatic messages |
| **SMS** | Africa's Talking (Kenya) | Local SMS gateway |
| **Email** | Resend (free: 3,000 emails/month) | Transactional receipts |
| **Image CDN** | Cloudinary free tier (25 GB/month) | Menu photos, receipt PDFs |
| **Monitoring** | LogRocket / Sentry (free tier) + Vercel Analytics | Error tracking and performance |
| **Repo** | GitHub (public or private) | Source control |
| **CI/CD** | GitHub Actions → Vercel | Automatic preview and production deploys |

### Realistic Hosting for 5,000 Orders/Day

> 5,000 orders/day ≈ 3.5 orders/min average, with lunch/dinner peaks of 30–80 orders/min. Free tiers can handle a soft launch, but sustained 5k/day will need a small paid upgrade.

**Recommended launch architecture (mostly free):**
- **Frontend:** Vercel Pro ($20/mo when scaling) or self-host on Render/Railway
- **Database:** Supabase Pro ($25/mo) for backups, connection pooling, and higher egress
- **Cache/Queue:** Upstash paid ($10–30/mo)
- **Total realistic launch cost:** $0–$50/month, then $55–$100/month at 5k orders/day
- **If budget is absolutely zero:** Use Vercel Hobby + Supabase Free + Upstash Free. Expect to upgrade once you hit ~1,000 orders/day or heavy peak traffic.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│  Customer PWA  │  Owner Dashboard  │  Rider App (mobile web/PWA)    │
│   (Next.js)    │    (Next.js)      │     (Next.js mobile view)      │
└────────────────────┬────────────────────────────────────────────────┘
                     │ HTTPS / WebSocket / Server-Sent Events
┌────────────────────▼────────────────────────────────────────────────┐
│                        VERCEL EDGE / SERVERLESS                      │
│  Next.js App Router  │  API Routes  │  Server Actions  │ Middleware │
└────────────────────┬────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌──────────┐
   │Supabase │  │ Upstash │  │ Upstash  │
   │Postgres │  │  Redis  │  │  QStash  │
   │Realtime │  │         │  │ (jobs)   │
   └────┬────┘  └────┬────┘  └────┬─────┘
        │            │            │
        └────────────┴────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌─────────┐  ┌─────────┐  ┌──────────┐
   │  M-Pesa │  │  Meta   │  │ Africa's │
   │ Daraja  │  │WhatsApp │  │ Talking  │
   │  API    │  │ Cloud   │  │   SMS    │
   └─────────┘  └─────────┘  └──────────┘
```

---

## 4. Database Schema (Drizzle ORM)

Create a single file `src/db/schema.ts` with the following tables.

### 4.1 Core Tables

```typescript
// Users & Roles
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  email: text("email"),
  role: text("role").$type<"customer" | "owner" | "admin" | "rider">().default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu Categories & Items
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  isPopular: boolean("is_popular").default(false),
  prepTimeMinutes: integer("prep_time_minutes").default(15),
  options: jsonb("options").$type<{ name: string; price: number }[]>(),
});

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").unique().notNull(), // e.g. AMR-000123
  userId: uuid("user_id").references(() => users.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  type: text("type").$type<"delivery" | "pickup" | "dine_in">().notNull(),
  status: text("status").$type<
    "pending_payment" | "paid" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "picked_up" | "cancelled"
  >().default("pending_payment").notNull(),
  paymentStatus: text("payment_status").$type<"pending" | "paid" | "failed" | "refunded">().default("pending"),
  paymentMethod: text("payment_method").$type<"mpesa" | "cash" | "card">().default("mpesa"),
  mpesaReceiptNumber: text("mpesa_receipt_number"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
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
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  options: jsonb("options"),
});

// Payments
export const payments = pgTable("payments", {
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
});

// Delivery Tracking
export const riderLocations = pgTable("rider_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  riderId: uuid("rider_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  lat: decimal("lat", { precision: 10, scale: 6 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 6 }).notNull(),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).unique(),
  userId: uuid("user_id").references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Complaints / Support Tickets
export const complaints = pgTable("complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id),
  phone: text("phone"),
  category: text("category").$type<"missing_item" | "wrong_item" | "late_delivery" | "quality" | "payment" | "other">(),
  description: text("description").notNull(),
  status: text("status").$type<"open" | "in_progress" | "resolved" | "escalated">().default("open"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<"sms" | "whatsapp" | "push" | "email">(),
  channel: text("channel"),
  title: text("title"),
  body: text("body").notNull(),
  status: text("status").$type<"pending" | "sent" | "failed" | "read">().default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Settings (owner configurable)
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").unique().notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit / Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(), // e.g. status_changed, payment_received
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 4.2 Indexes

Add these indexes for performance:

- `orders.user_id`, `orders.status`, `orders.created_at`
- `orders.rider_id`, `orders.status`
- `order_items.order_id`
- `payments.checkout_request_id`
- `rider_locations.order_id`, `rider_locations.recorded_at`
- `reviews.order_id`
- `complaints.order_id`, `complaints.status`

---

## 5. Feature Build Steps

### Phase 1: Foundation (Week 1)

#### 5.1.1 Project Setup
1. Use the existing Next.js + Drizzle + Tailwind project.
2. Install required packages:
   ```bash
   npm install @clerk/nextjs drizzle-orm pg postgres zod react-hook-form @hookform/resolvers framer-motion lucide-react @radix-ui/react-dialog @radix-ui/react-toast class-variance-authority clsx tailwind-merge
   npm install -D drizzle-kit @types/pg
   ```
3. Configure environment variables in `.env`:
   ```env
   # Database
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
   
   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   
   # M-Pesa
   MPESA_CONSUMER_KEY=...
   MPESA_CONSUMER_SECRET=...
   MPESA_PASSKEY=...
   MPESA_SHORTCODE=...
   MPESA_ENV=sandbox # or production
   MPESA_CALLBACK_BASE_URL=https://yourdomain.vercel.app
   
   # Google Maps
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
   
   # WhatsApp / Meta
   WHATSAPP_ACCESS_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   
   # Africa's Talking
   AT_API_KEY=...
   AT_USERNAME=...
   
   # Redis / QStash
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   QSTASH_TOKEN=...
   QSTASH_CURRENT_SIGNING_KEY=...
   QSTASH_NEXT_SIGNING_KEY=...
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   
   # Resend Email
   RESEND_API_KEY=...
   ```
4. Setup Drizzle config (`drizzle.config.ts`) and run `npx drizzle-kit push` to create tables.

#### 5.1.2 Design System
1. Create brand colors based on Amorino coastal/warm vibe:
   - Primary: `#D97706` (amber/orange warmth)
   - Secondary: `#0F766E` (teal coastal)
   - Background: `#FFFBF5` (cream)
   - Text: `#1F2937`
   - Success: `#16A34A`
   - Danger: `#DC2626`
2. Configure Tailwind theme in `tailwind.config.ts`.
3. Create reusable shadcn-style components: Button, Card, Input, Badge, Sheet, Toast, Dialog, Tabs, Skeleton.
4. Add Framer Motion page transitions and micro-interactions.

---

### Phase 2: Customer-Facing Website (Week 2)

#### 5.2.1 Public Pages
Build these routes in `src/app/`:

| Route | Purpose |
|-------|---------|
| `/` | Hero, brand story, popular items, Instagram/TikTok embeds, CTA to order |
| `/menu` | Full categorized menu with search, filters, favorites |
| `/menu/[slug]` | Item detail modal/page with options/add-ons |
| `/cart` | Cart review, quantities, special instructions |
| `/checkout` | Customer details, delivery/pickup choice, payment |
| `/track/[orderNumber]` | Public order tracking (no login required, use phone + order number) |
| `/review/[orderNumber]` | Leave review after delivery |
| `/complain` | Submit complaint/ticket |
| `/contact` | Location, WhatsApp, phone, hours |

#### 5.2.2 Menu System
1. Fetch categories and menu items from `/api/menu`.
2. Display menu as horizontal category tabs + vertical item cards.
3. Each card: image, name, price, prep time, badge (popular/veg/spicy).
4. Click card → open detail sheet/modal with options and quantity.
5. Add to cart → store in `localStorage` + React context/Zustand.
6. Search and filter by category, price, dietary tags.

#### 5.2.3 Cart & Checkout
1. Cart persists across sessions in `localStorage`.
2. Show item count badge on header.
3. Checkout form collects:
   - Name
   - Phone (required, used for M-Pesa and tracking)
   - Email (optional, for receipts)
   - Order type: Delivery / Pickup / Dine-in
   - Delivery address with Google Places autocomplete
   - Special instructions
4. Calculate totals: subtotal + delivery fee (based on zone/distance) − discount.
5. Delivery fee rules stored in `settings` table (e.g. free within 3km, KES 100 beyond).

---

### Phase 3: M-Pesa STK Push Integration (Week 2–3)

#### 5.3.1 Daraja API Setup
1. Register app on [Safaricom Developer Portal](https://developer.safaricom.co.ke/).
2. Get Consumer Key, Consumer Secret, Passkey, Shortcode.
3. Build helper `src/lib/mpesa.ts`:
   - `getAccessToken()` — OAuth token
   - `initiateStkPush(phone, amount, orderNumber, callbackUrl)` — STK push
   - `validateCallback(body)` — verify callback signature

#### 5.3.2 Payment Flow
1. Customer clicks **Pay with M-Pesa** on checkout.
2. Backend creates `Payment` record with status `initiated`.
3. Backend calls Daraja `stkpush/v1/processrequest`.
4. Customer receives STK popup on phone and enters PIN.
5. Safaricom sends callback to `POST /api/payments/mpesa/callback`.
6. Validate callback, update `Payment.status`, `Order.paymentStatus`, and `Order.status`:
   - Success: `pending_payment` → `paid` → `confirmed`
   - Failure: remain `pending_payment` and allow retry
7. Emit real-time event to customer.
8. Send WhatsApp/SMS receipt.

#### 5.3.3 Fallbacks
- If callback is delayed, provide a **Check Payment Status** button that polls `GET /api/payments/status?checkoutRequestId=...`.
- Allow cash on pickup/delivery as fallback.

---

### Phase 4: Order Tracking (Preparation to Pickup/Delivery) (Week 3)

#### 5.4.1 Order Status Machine
Define strict status transitions:

```
pending_payment → paid → confirmed → preparing → ready → out_for_delivery → delivered
                ↓
            cancelled

For pickup:
pending_payment → paid → confirmed → preparing → ready → picked_up
```

#### 5.4.2 Status Update UI
1. Customer tracking page `/track/AMR-000123` shows visual timeline.
2. Each status has an icon, time, and description.
3. Use Framer Motion to animate status changes.
4. ETA is shown: "Ready in ~25 minutes".

#### 5.4.3 Real-Time Updates
1. Use Supabase Realtime to listen to `orders` table changes.
2. On status update, push to all connected clients watching that order.
3. Also send SMS/WhatsApp at key transitions:
   - Paid → confirmed
   - Preparing
   - Ready for pickup
   - Out for delivery
   - Delivered + review link

---

### Phase 5: Delivery Tracking with Google Maps (Week 3)

#### 5.5.1 Rider Location Flow
1. Rider logs in via `/rider` route on their phone.
2. Rider's browser uses Geolocation API to send location every 15–30 seconds to `POST /api/rider/location`.
3. Store in `rider_locations` table.
4. Customer's tracking page subscribes to location updates.
5. Map shows:
   - Customer location (delivery address)
   - Rider location (moving marker)
   - Route polyline from rider to customer

#### 5.5.2 Google Maps Implementation
1. Load `@react-google-maps/api`.
2. Use DirectionsService to calculate ETA and route.
3. Show estimated arrival time on customer screen.
4. For pickup orders, show cafe location pin.

#### 5.5.3 Rider App Features
- List assigned orders
- Update order status with one tap
- Navigate to customer via Google Maps app link
- Offline-aware: queue updates if signal drops

---

### Phase 6: Owner Dashboard & Analytics (Week 4)

#### 5.6.1 Admin Routes
| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard overview |
| `/admin/orders` | Live order management |
| `/admin/menu` | Menu CRUD |
| `/admin/riders` | Rider management |
| `/admin/analytics` | Sales analytics |
| `/admin/reviews` | Review moderation |
| `/admin/complaints` | Complaint resolution |
| `/admin/settings` | Business settings |

#### 5.6.2 Dashboard Widgets
1. **Today's Summary:**
   - Total orders
   - Revenue
   - Average order value
   - Active orders
   - Pending complaints
2. **Live Order Board:**
   - Kanban-style columns per status
   - Drag to change status
   - Assign rider
3. **Analytics Charts (using Recharts):**
   - Sales by day/week/month
   - Revenue by hour (peak times)
   - Top selling items
   - Payment method split
   - Order type split (delivery vs pickup)
   - Rider performance (delivery times)
   - Customer retention / repeat rate
4. **Reports:**
   - Export CSV/PDF of sales, orders, rider performance

#### 5.6.3 Menu Management
1. CRUD categories and items.
2. Upload images to Cloudinary.
3. Toggle availability.
4. Set popular flag, prep time, options/add-ons.

---

### Phase 7: Reviews & Ratings (Week 4)

1. 24 hours after delivery/pickup, send review link via WhatsApp/SMS.
2. Review page: 1–5 star rating, comment, optional photo.
3. Admin can moderate reviews (hide inappropriate ones).
4. Display average rating and review count on menu/homepage.
5. Show latest reviews in admin dashboard.

---

### Phase 8: Complaint Management (Week 4)

1. Customer can submit complaint from `/complain` or order tracking page.
2. Form fields: order number (optional), category, description, phone.
3. Admin sees complaints in `/admin/complaints`.
4. Assign to staff, update status, add resolution notes.
5. Auto-notify customer on status change.
6. Escalation: if unresolved in 24h, notify owner via WhatsApp/SMS.

---

### Phase 9: Settings & Notifications System (Week 5)

#### 5.9.1 Settings Module
Store these in `settings` table:

```json
{
  "businessName": "Amorino Café",
  "phone": "0706090909",
  "email": "hello@amorinocafe.co.ke",
  "address": "Makadara Rd, Mombasa",
  "googleMapsLink": "https://maps.app.goo.gl/...",
  "openingHours": { "mon": "07:00-23:00", ... },
  "delivery": {
    "enabled": true,
    "freeDeliveryRadiusKm": 3,
    "baseDeliveryFee": 100,
    "extraFeePerKm": 50,
    "maxDistanceKm": 10
  },
  "mpesa": {
    "shortcode": "...",
    "enabled": true
  },
  "notifications": {
    "smsOnOrder": true,
    "whatsappOnOrder": true,
    "emailReceipt": true,
    "ownerAlertPhone": "0706090909"
  }
}
```

#### 5.9.2 Notifications System
Build `src/lib/notifications.ts` with channels:

| Channel | Provider | Use Case |
|---------|----------|----------|
| SMS | Africa's Talking | Order confirmations, OTP, status updates |
| WhatsApp | Meta Cloud API / Twilio | Rich receipts, review requests, complaints |
| Push (web) | Firebase Cloud Messaging | Real-time order status |
| Email | Resend | Digital receipt, weekly summary to owner |

1. Create a notification queue job in QStash/Inngest.
2. When an event fires (order placed, status changed, complaint), enqueue notification.
3. Worker sends via configured channels and logs status.
4. Admin can enable/disable each channel in settings.

---

### Phase 10: WhatsApp Integration (Week 5)

#### 5.10.1 Click-to-Chat (Free)
Add `https://wa.me/254706090909?text=...` links across the site:
- Header "Chat with us"
- Order tracking "Need help?"
- Complaint page

#### 5.10.2 Programmatic WhatsApp (Meta Cloud API)
1. Register business phone number with Meta.
2. Use message templates for:
   - Order confirmation
   - Payment receipt
   - Status updates
   - Review request
   - Complaint update
3. Backend sends template messages via `POST /api/whatsapp/send`.
4. Support incoming messages for order inquiries (webhook).

#### 5.10.3 WhatsApp Order Inquiries
1. Customer texts "Where is my order AMR-000123".
2. Webhook receives message, parses order number.
3. Reply with current status and ETA.

---

### Phase 11: Authentication & Authorization (Week 1–2)

1. Use Clerk with roles in public metadata.
2. Middleware protects `/admin/*` and `/rider/*` routes.
3. Customers can checkout as guest (phone-based) or sign in.
4. Phone number must match M-Pesa number.
5. Sync Clerk users to `users` table via webhooks.

---

### Phase 12: Performance & Scaling (Week 5–6)

1. **Database:**
   - Add connection pooling (PgBouncer/Supabase pooler).
   - Add indexes for frequent queries.
   - Archive old orders after 90 days if needed.
2. **Caching:**
   - Cache menu in Redis with 5-minute TTL.
   - Cache analytics with 1-hour TTL.
3. **Rate Limiting:**
   - Use Upstash Redis to rate limit API routes (e.g. checkout attempts, M-Pesa pushes).
4. **Image Optimization:**
   - Use Next.js Image + Cloudinary transformations.
5. **Edge Functions:**
   - Use Vercel Edge for lightweight reads (menu, tracking status).
6. **Monitoring:**
   - Sentry for errors.
   - Vercel Analytics for web vitals.
   - Custom dashboard for order volume and failures.

---

## 6. API Route Design

Create all routes under `src/app/api/`:

### Public Routes
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/menu` | List categories + items |
| GET | `/api/menu/[id]` | Item detail |
| POST | `/api/orders` | Create order |
| GET | `/api/orders/track` | Track by orderNumber + phone |
| POST | `/api/reviews` | Submit review |
| POST | `/api/complaints` | Submit complaint |
| POST | `/api/payments/mpesa/initiate` | Initiate STK push |
| POST | `/api/payments/mpesa/callback` | M-Pesa callback |
| GET | `/api/payments/status` | Check payment status |
| POST | `/api/rider/location` | Rider location update |
| POST | `/api/whatsapp/webhook` | Incoming WhatsApp |

### Admin Routes (protected)
| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/admin/orders` | List/update orders |
| GET/POST/PUT/DELETE | `/api/admin/menu` | Menu CRUD |
| GET/POST | `/api/admin/riders` | Rider management |
| GET | `/api/admin/analytics` | Analytics data |
| GET/POST | `/api/admin/reviews` | Review moderation |
| GET/POST | `/api/admin/complaints` | Complaint management |
| GET/POST | `/api/admin/settings` | Settings CRUD |

---

## 7. UI/UX & Animation Requirements

1. **Brand-first design:** Warm coastal colors, high-quality food photography, Amorino logo.
2. **Mobile-first:** 70%+ orders will come from phones.
3. **Smooth animations:**
   - Page transitions with Framer Motion `AnimatePresence`
   - Menu cards fade/slide in on scroll
   - Cart badge bounces on add
   - Status timeline animates progress
   - Skeleton loaders for async data
4. **Accessibility:** WCAG 2.1 AA, keyboard navigation, focus states, alt text.
5. **PWA:** Installable app icon, offline menu browsing, push notifications.

---

## 8. Free Domain & Hosting Strategy

1. **Frontend:** Deploy to Vercel.
   - Free domain: `amorino-cafe.vercel.app`
   - Later connect custom domain in Vercel settings.
2. **Backend:** Same Next.js app on Vercel (serverless functions).
3. **Database:** Supabase free tier.
   - Free subdomain/connection string.
4. **GitHub:**
   - Create repository `amorino-cafe`
   - Push code
   - Connect Vercel Git integration for auto-deploys
5. **Custom domain later:**
   - Buy domain (e.g. amorinocafe.co.ke)
   - Add to Vercel and configure DNS
   - Update M-Pesa callback URL
   - Update WhatsApp webhook URL

---

## 9. Security & Compliance

1. **HTTPS everywhere** (Vercel provides SSL automatically).
2. **Environment variables** for all secrets.
3. **Input validation** with Zod on all API routes.
4. **SQL injection protection** via Drizzle ORM parameterized queries.
5. **XSS protection** via React escaping + CSP headers.
6. **M-Pesa callback validation** (check result code, never trust blindly).
7. **Rate limiting** on sensitive endpoints.
8. **GDPR/Kenya Data Protection:**
   - Privacy policy page
   - Consent for marketing messages
   - Data retention rules
   - Secure deletion on request
9. **Role-based access control** for admin/rider/customer.

---

## 10. Testing Strategy

1. **Unit Tests:** Vitest for utilities, calculations, M-Pesa helpers.
2. **Integration Tests:** Playwright for critical flows:
   - Browse menu → add to cart → checkout → pay
   - Admin updates order status → customer sees update
   - Rider updates location → customer map updates
3. **API Tests:** Postman/Insomnia collection for all endpoints.
4. **Load Tests:** k6 to simulate 100 concurrent checkout attempts.
5. **Manual Tests:**
   - M-Pesa sandbox end-to-end
   - WhatsApp template sending
   - SMS delivery in Kenya
   - Google Maps on low-end Android phones

---

## 11. Development Roadmap (8–10 Weeks)

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Setup, auth, DB schema, design system | Project scaffold, deployed landing page |
| 2 | Menu, cart, checkout, M-Pesa STK | Customer can place and pay for order |
| 3 | Order tracking, rider location, Google Maps | End-to-end tracking working |
| 4 | Admin dashboard, analytics, reviews, complaints | Owner can manage business |
| 5 | Notifications, WhatsApp, settings | Full communication system |
| 6 | Performance, testing, security hardening | Stable beta |
| 7 | Beta with real customers, bug fixes | Refined UX |
| 8 | Launch + monitoring | Production go-live |

---

## 12. Cost Projection

| Component | Launch (Free) | Scale (~5k orders/day) |
|-----------|---------------|------------------------|
| Vercel | Hobby $0 | Pro $20 |
| Supabase | Free $0 | Pro $25 |
| Upstash Redis/QStash | Free $0 | $20 |
| Google Maps | Free $200 credit | $0–$20 |
| Africa's Talking SMS | Pay per SMS | ~$150–300 |
| WhatsApp Cloud API | Free tier conversations | ~$50–150 |
| Cloudinary | Free $0 | $25 |
| Clerk | Free $0 | $25 |
| Resend | Free $0 | $0 |
| **Total** | **$0/month** | **~$100–300/month** |

> SMS and WhatsApp are usage-based and become the main cost at scale.

---

## 13. M-Pesa Daraja Code Skeleton

```typescript
// src/lib/mpesa.ts
import axios from 'axios';
import { createHash } from 'crypto';

const BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

export async function getAccessToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return res.data.access_token;
}

export function generatePassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

export async function initiateStkPush({
  phone,
  amount,
  orderNumber,
  callbackUrl,
}: {
  phone: string;
  amount: number;
  orderNumber: string;
  callbackUrl: string;
}) {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = generatePassword(process.env.MPESA_SHORTCODE!, process.env.MPESA_PASSKEY!, timestamp);

  const formattedPhone = phone.startsWith('0')
    ? '254' + phone.slice(1)
    : phone.startsWith('+')
    ? phone.slice(1)
    : phone;

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(amount),
    PartyA: formattedPhone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: orderNumber,
    TransactionDesc: `Payment for ${orderNumber}`,
  };

  const res = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
```

---

## 14. Real-Time Order Tracking Code Skeleton

```typescript
// src/lib/realtime.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function subscribeToOrder(orderId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      callback
    )
    .subscribe();
}
```

---

## 15. Google Maps Delivery Tracking Skeleton

```typescript
// components/DeliveryMap.tsx
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useEffect, useState } from 'react';

export function DeliveryMap({ riderLat, riderLng, customerLat, customerLng }: Props) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
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
  }, [riderLat, riderLng, customerLat, customerLng]);

  return (
    <GoogleMap center={{ lat: riderLat, lng: riderLng }} zoom={15} mapContainerClassName="h-96 w-full">
      <Marker position={{ lat: riderLat, lng: riderLng }} icon="/icons/rider.png" />
      <Marker position={{ lat: customerLat, lng: customerLng }} icon="/icons/customer.png" />
      {directions && <DirectionsRenderer directions={directions} />}
    </GoogleMap>
  );
}
```

---

## 16. Analytics SQL Views

Create these views in Supabase for fast analytics:

```sql
-- Daily sales summary
CREATE VIEW analytics_daily_sales AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_orders,
  SUM(total)::numeric AS revenue,
  AVG(total)::numeric AS avg_order_value
FROM orders
WHERE status NOT IN ('cancelled', 'pending_payment')
GROUP BY DATE(created_at);

-- Hourly order volume
CREATE VIEW analytics_hourly_volume AS
SELECT 
  EXTRACT(HOUR FROM created_at) AS hour,
  COUNT(*) AS orders
FROM orders
GROUP BY EXTRACT(HOUR FROM created_at);

-- Top items
CREATE VIEW analytics_top_items AS
SELECT 
  name,
  SUM(quantity) AS total_sold,
  SUM(total_price)::numeric AS revenue
FROM order_items
GROUP BY name
ORDER BY total_sold DESC;
```

---

## 17. Launch Checklist

- [ ] All env vars set in Vercel production
- [ ] Database migrated with `drizzle-kit push`
- [ ] Seed initial menu items from Amorino PDF/menu photos
- [ ] M-Pesa Daraja production credentials + callback URL registered
- [ ] WhatsApp Business phone number verified
- [ ] Google Maps API key with Maps JavaScript API enabled
- [ ] Africa's Talking account funded for SMS
- [ ] Clerk production keys configured
- [ ] Privacy policy and terms pages live
- [ ] Owner admin account created and role assigned
- [ ] Test rider account created
- [ ] End-to-end order + payment + tracking tested
- [ ] Domain DNS configured (when purchased)
- [ ] Sentry/LogRocket monitoring active

---

## 18. Post-Launch Enhancements (Future)

1. Loyalty program / stamps
2. Subscription meal plans
3. Table reservation system
4. Multi-branch support
5. Inventory management
6. Kitchen display system (KDS)
7. AI chatbot for WhatsApp/website
8. Integration with Glovo/Bolt Food as additional channels

---

## Summary for the AI Builder

Build a **Next.js 14 full-stack app** with:
- **PostgreSQL + Drizzle ORM** for all data
- **Clerk** for auth with owner/rider/customer roles
- **M-Pesa Daraja STK Push** for payments
- **Supabase Realtime** for live order updates
- **Google Maps** for delivery tracking
- **WhatsApp Cloud API + SMS** for notifications
- **Owner dashboard** with analytics and management tools
- **Mobile-first, animated UI** using Tailwind, shadcn/ui, and Framer Motion
- **Free hosting on Vercel + Supabase + Upstash**, with a clear upgrade path to handle 5,000 orders/day

Start with the database schema and authentication, then build the customer ordering flow, then payments, then tracking, then admin tools, then notifications and WhatsApp. Test end-to-end in M-Pesa sandbox before going live.
