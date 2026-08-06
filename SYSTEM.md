# Amorino Café — System Documentation

Complete system context for the Amorino Café online ordering platform.
**Site**: https://amorino-five.vercel.app · **Repo**: https://github.com/Hamoudy10/amorino

---

## 1. Overview

Amorino Café (Makadara Rd, Mombasa) is a coastal restaurant brand selling Mandi, BBQ, seafood,
shawarma, coffee, shakes and cakes. This system is a production-oriented online ordering
platform built around three audiences:

| Audience | Entry point | What they do |
|---|---|---|
| **Customers** | Public site | Browse the full menu, add to cart, order delivery/pickup/dine-in, pay via M-Pesa STK push or cash, track the order live on a map, review, complain |
| **Owner / Admin** | `/admin` | Orders board (kanban), menu management with image uploads, riders, fleet live map, analytics, reviews moderation, complaints, settings |
| **Riders** | `/rider` | See assigned orders, update statuses, share live GPS location, navigate to customers, call customers |

Key principles established during development:
- **Guest-first ordering** — customers can order without an account; accounts are only needed for admin/rider roles and the "My Orders" history.
- **Graceful degradation** — every third-party integration (M-Pesa, WhatsApp, SMS, email, Redis, Supabase, Maps) fails softly; the app keeps working with toasts/fallbacks.
- **Robustness over cleverness** — several production bugs were found and fixed during rollout (FK mismatches, connection pooling, SSL handling, payment polling semantics). These fixes are documented in §12 so future work doesn't reintroduce them.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.3.0** (App Router, Turbopack, `src/` dir) | React 19.2, TypeScript 5 |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) + CSS-variable theme | Brand tokens in `globals.css` |
| UI components | Hand-written **shadcn-style** components (Radix primitives) | No `components.json`/CLI (interactive CLI was unusable) |
| Animations | **framer-motion 12** (use `framer-motion/client` or client components only — RSC-safe) | |
| Icons | **lucide-react** | Note: no `Instagram` brand icon in this version; `Camera` is used |
| Database | **PostgreSQL** via **Supabase** (pooler) | Drizzle ORM 0.45 + `pg` |
| ORM | **drizzle-orm / drizzle-kit** | Migration files in `drizzle/` |
| Auth | **Clerk** (email/Google; phone sign-up unsupported for Kenya) | Roles in `publicMetadata` + DB fallback |
| Payments | **M-Pesa Daraja API** (STK Push, sandbox & production) | |
| Realtime | **Supabase Realtime** (broadcast) + polling fallback | |
| Storage | **Supabase Storage** (`food-images` bucket, public) | Menu image uploads |
| Cache/Rate-limit | **Upstash Redis** | Analytics cache, rate limits |
| Queues | **Upstash QStash** | Job worker (`/api/jobs/[job]`) |
| Email | **Resend** | Receipts (optional) |
| SMS | **Africa's Talking** | Order notifications (optional) |
| WhatsApp | **Meta Cloud API** | Template messages (optional; NOT configured yet) |
| Maps | **@react-google-maps/api** | Customer tracker, rider map, admin fleet map |
| Charts | **recharts** | Admin analytics |
| Validation | **zod** | All API inputs |
| Toasts | **sonner** | |
| Others | axios, date-fns, svix (Clerk webhook verify), class-variance-authority, clsx, tailwind-merge | |

**Typographic system**: Geist (sans, body) + Playfair Display (serif display headings, registered as `--font-playfair` → `font-display` utility).

---

## 3. Project Layout

```
D:\Amorino
├── AMORINO CAFE.pdf          # Official menu PDF (source of seed data + logo + photos)
├── SYSTEM.md                 # This document
├── IMPLEMENTATION_PLAN.md    # Original build plan
├── docker-compose.yml        # Local Postgres 16 (postgres/postgres@127.0.0.1:5432/amorino)
├── drizzle.config.ts         # drizzle-kit config (loads .env.local, SSL-aware)
├── middleware.ts → src/middleware.ts   # Clerk auth gate (src/ required by Next 16)
├── public/
│   ├── logo.png              # Logo extracted from PDF, background removed, transparent
│   ├── icon-192.png / icon-512.png    # PWA icons (generated from logo)
│   └── food/*.jpg            # 18 real dish photos extracted from the PDF
├── src/
│   ├── middleware.ts         # Clerk middleware — sign-in gate for /admin,/rider,/account
│   ├── app/                  # Next App Router (pages + API routes)
│   ├── components/           # Client components (ui/, menu/, cart/, tracking/, rider/, admin/, account/, home/, checkout/, complaints/, reviews/, layout/, providers/)
│   ├── db/                   # schema.ts, index.ts (pool), seed.ts
│   ├── lib/                  # All business logic (see §6)
│   └── types/                # Shared types + ORDER_STATUS_LABELS (client-safe)
```

---

## 4. Database Schema (Postgres, Supabase)

All tables in `src/db/schema.ts`. Money columns are `decimal(10,2)` (returned as strings by pg).
IDs are UUIDs. Timestamps default `now()`.

### 4.1 `users`
| Column | Notes |
|---|---|
| id | UUID PK |
| clerk_id | text, unique — Clerk user ID (`user_...`) |
| phone | text, unique, **nullable** (Google/email users have none) |
| name, email | nullable |
| role | `customer` \| `owner` \| `admin` \| `rider`, default `customer` |
| is_active | bool default true |
| created_at / updated_at | |

### 4.2 `categories`
`id, name, slug (unique), description, sort_order, image_url, is_active, created_at`

### 4.3 `menu_items`
`id, category_id (FK, set null), name, slug (unique), description, price, image_url, is_available, is_popular, is_vegetarian, is_spicy, prep_time_minutes, options jsonb [{name, price}], created_at, updated_at` — indexed on category.

### 4.4 `orders`
`id, order_number (AMR-######, unique), user_id (FK users), customer_name, customer_phone, customer_email, type (delivery|pickup|dine_in), status (see machine §7), payment_status (pending|paid|failed|refunded), payment_method (mpesa|cash|card), mpesa_receipt_number, subtotal, delivery_fee, tip, discount, total, delivery_address, delivery_lat/lng (decimal 10,6), rider_id (FK users), special_instructions, estimated_ready_at, delivered_at, created_at, updated_at` — indexes on user, status, created, rider, (rider,status), phone.

### 4.5 `order_items`
`id, order_id (FK, cascade), menu_item_id (FK, set null), name, quantity, unit_price, total_price, options jsonb` — snapshot of the menu at purchase time.

### 4.6 `payments`
`id, order_id (FK, cascade), merchant_request_id, checkout_request_id (unique), phone_number, amount, status (initiated|success|failed|cancelled), result_code, result_desc, mpesa_receipt_number, transaction_date, raw_callback jsonb, created_at`.

### 4.7 `rider_locations`
`id, rider_id (FK users, cascade), order_id (FK, cascade), lat/lng (10,6), accuracy, recorded_at` — one row per GPS ping (rider broadcasts every 15 s).

### 4.8 `reviews`
`id, order_id (FK, cascade, **unique** — one review per order), user_id, rating (1-5), comment, is_visible (moderation flag), created_at`.

### 4.9 `complaints`
`id, order_id (FK, set null), user_id, phone, category (missing_item|wrong_item|late_delivery|quality|payment|other), description, status (open|in_progress|resolved|escalated), assigned_to (FK users), resolution, created_at, updated_at`.

### 4.10 `notifications`
`id, user_id (FK, cascade), order_id (FK, cascade), type (sms|whatsapp|push|email), channel, title, body, status (pending|sent|failed|read), metadata jsonb, created_at` — every send attempt is logged here.

### 4.11 `settings`
`id, key (unique), value jsonb, updated_at` — stores `business`, `delivery`, `mpesa`, `notifications` objects (see §9).

### 4.12 `activity_logs`
`id, order_id (FK, cascade), user_id (FK users), action, metadata jsonb, created_at` — audit trail (order_created, status_changed, rider_assigned, payment_received, …).

**Critical detail**: `user_id` columns are FKs to `users.id` (UUID). Callers that hold a Clerk ID (`user_...`) must resolve it first via `resolveActorUserId()` in `src/lib/orders.ts` — this was a real production bug (§12.7).

---

## 5. Authentication & Authorization

- **Clerk** handles sessions (email + password / Google OAuth). Phone sign-up is NOT supported by Clerk for Kenya — customers/admin/riders use email.
- **`src/middleware.ts`** (must live in `src/` for Next 16): only **enforces sign-in** for `/admin/*`, `/rider/*`, `/account/*`. Role checks happen server-side (middleware runs on the edge without a DB).
- **Roles** live in Clerk `publicMetadata.role` AND in `users.role`.
  - Set by: Clerk dashboard → Users → Public metadata `{"role":"owner"}`, or the admin "Add rider" flow (sets both via API).
  - **Resolution order in `getSessionUser()`** (`src/lib/auth.ts`): session claims → if claim is `customer`, **DB fallback** by `clerk_id` (so stale tokens never lock anyone out). This fallback was the fix for the "kicked to /rider" bug.
- **Helpers**:
  - `getSessionUser()` — `{ id (clerk), clerkId, role, phone }`
  - `getSessionUserWithDbId()` — adds `dbUserId` (users.id UUID) — used by rider APIs.
  - `requireRole(...roles)` — used by every admin API.
  - `upsertUserFromClerk()` — webhook sync; inserts by phone or email; supports phone-less users.
  - `setUserRole(clerkId, role)` — updates Clerk metadata + DB.
  - `getDbUserId(clerkId)` — clerk → UUID.
- **Clerk webhook** `/api/webhooks/clerk` — verifies `svix` signatures with `CLERK_WEBHOOK_SECRET`; syncs `user.created/updated/deleted` (deleted clears `clerk_id`, keeps the row for history).
- **`/api/auth/me`** — returns the current session's role (used by the rider app; great diagnostic).
- **Important**: after changing a role in Clerk, the user should re-sign-in (token carries claims), though the DB fallback usually makes even that unnecessary.

---

## 6. Library Modules (`src/lib/`)

| Module | Responsibility |
|---|---|
| `auth.ts` | Session/role resolution, Clerk webhook helpers (see §5) |
| `api.ts` | Response helpers: `ok(data)`, `fail(msg, status, details)`, `unauthorized()`, `forbidden()`, `serverError()` — all JSON `{ ok: true, data }` / `{ ok: false, error }` |
| `utils.ts` | `cn`, `formatKES`, `formatKESDecimal`, `formatDateTime`, `formatTime`, `timeAgo`, `normalizePhone`, `displayPhone`, `generateOrderNumber`, `randomId`, `whatsappDeepLink` (client-safe) |
| `coords.ts` | **Client-safe** `CAFE_COORDS` (-4.0435, 39.6682) + `haversineKm` (no DB imports!) |
| `settings.ts` | Typed `AppSettings` (business/delivery/mpesa/notifications), `getSettings()`, `updateSetting()`, `seedDefaultSettings()`, `calculateDeliveryFee()` (server), re-exports CAFE_COORDS |
| `validators.ts` | All zod schemas (phone, orders, track, reviews, complaints, mpesa, rider location, admin updates, menu/category admin, settings, complaint admin, review moderation, rider assignment) |
| `orders.ts` | `createOrder`, `getNextOrderNumber` (AMR-###### sequence), `updateOrderStatus` (state machine), `assignRider`, `trackOrder` (joins rider name/phone), `getActiveOrders`, `canTransition`, `resolveActorUserId`, status labels |
| `payments.ts` | `markPaymentSuccess` (flips order → paid/confirmed, logs, notifies, emits event), `markPaymentFailed` |
| `mpesa.ts` | Daraja: token cache, STK push initiate, status query, password gen, callback parse, `isMpesaConfigured` |
| `notifications.ts` | `sendSms` (AT), `sendWhatsAppTemplate` (Meta), `sendEmail` (Resend), `logNotification`, `notifyOrderStatus` (per-status templates), graceful when unconfigured |
| `realtime.ts` | Supabase client singleton (`getSupabase`), `emitOrderEvent` (broadcast `order:update`), `subscribeToOrder` (client), `isRealtimeConfigured` |
| `redis.ts` | `getRedis`, `cacheGet/Set/Delete`, `rateLimit` (all fail-open when Redis missing) |
| `qstash.ts` | QStash client + job scheduling helpers |
| `jobs.ts` | Job definitions (notification reminders etc.) |
| `analytics.ts` | SQL aggregate helpers + view constants (summary, sales by day, hourly, top items, payment/order splits, rider performance, repeat rate, avg rating) |
| `menu-data.ts` | `getPublicMenu` (active cats + available items), `getPopularItems`, item/category lookups |
| `clerk-admin.ts` | `findClerkUser(email|phone)` → Clerk API lookup (add riders without leaving the app), `getRiderCandidates` (signed-up customers, one-click promote) |
| `upload.ts` | `uploadFoodImage(file)` → Supabase Storage public URL |
| `request.ts` | `getClientIp` |
| `rider-client.ts` | `getUserRole` (client-side role check for rider app) |

---

## 7. Order Lifecycle & State Machine

Order numbers: `AMR-######` (sequence derived from the max existing number).

### Statuses
`pending_payment → paid → confirmed → preparing → ready → out_for_delivery → delivered` (and `picked_up` for pickup, `cancelled` anywhere allowed).

### Allowed transitions (`ALLOWED_TRANSITIONS` in `lib/orders.ts`)
| From | To |
|---|---|
| pending_payment | paid, cancelled |
| paid | confirmed, cancelled |
| confirmed | preparing, cancelled |
| preparing | ready, cancelled |
| ready | out_for_delivery, picked_up, delivered |
| out_for_delivery | delivered |
| delivered / picked_up | (terminal) |

### Creation
- `POST /api/orders` validates with zod, rate-limited (5/min/IP via Redis), resolves the signed-in user to `users.id`, computes subtotal from the live menu, delivery fee (server-side, §9), tip, total = subtotal + fee + tip.
- **Cash** orders start `confirmed`; **M-Pesa** orders start `pending_payment`.
- `estimated_ready_at` = now + (max item prep time + 10) min.
- Writes activity log, emits realtime event, notifies (cash only at creation).

### Payment success (`markPaymentSuccess`)
- Payment → `success`; order → `paymentStatus=paid`, `status=confirmed` (if not already); saves receipt; logs `payment_received`; emits event; notifies via channels.

### "Pay cash on delivery" (`POST /api/orders/switch-to-cash`)
- Public, phone-verified against the order; only from `pending_payment`; flips to `confirmed` + `payment_method=cash`.

---

## 8. Payments — M-Pesa Daraja (STK Push)

### Flow
1. Checkout → `POST /api/orders` (order in `pending_payment`) → `POST /api/payments/mpesa/initiate {orderNumber, phone}`.
2. Initiate gets an OAuth token (cached ~50 min), builds `Password = base64(shortcode + passkey + timestamp)`, sends `stkpush/v1/processrequest` with `CallBackURL = MPESA_CALLBACK_BASE_URL + /api/payments/mpesa/callback`.
3. Customer approves the STK push on their phone.
4. Daraja calls the callback → `parseCallbackMetadata` extracts receipt/date/amount → `markPaymentSuccess` (idempotent).
5. Meanwhile the checkout UI polls `GET /api/payments/status?checkoutRequestId=...` every 4 s as a fallback.

### Status semantics (important — fixed in production)
- Success codes: `0, "0", "00", "00000000"` → success.
- `1032` (cancelled by user) and `1037` (timeout) → terminal failure.
- **`4999` "still under processing" and everything else → keep polling** (the original code failed instantly on 4999, marking paid orders as failed — fixed).
- A **late success callback overrides a previously-failed payment** (callback route only short-circuits on `success`, not `failed`).

### Environment
`MPESA_ENV=sandbox|production`, `MPESA_SHORTCODE=174379` (sandbox) or your paybill, `MPESA_CONSUMER_KEY/SECRET`, `MPESA_PASSKEY`, `MPESA_CALLBACK_BASE_URL` (public HTTPS — Vercel URL or a tunnel for local).
- **Sandbox test phone**: `254708374149` (auto-approves, simulated — no real push/no money).
- **Real phone testing** requires a live app + real paybill (Go-Live in the Daraja portal); the house-rentals paybill credentials can be reused for testing but the money lands on that paybill.

---

## 9. Settings & Delivery Fee

Stored as JSON rows in `settings` (`business`, `delivery`, `mpesa`, `notifications`), defaults in `lib/settings.ts`, editable at `/admin/settings`.

**Delivery pricing** (`calculateDeliveryFee` + mirrored client-side at checkout):
- Free within `freeDeliveryRadiusKm` (3 km).
- Beyond: `baseDeliveryFee (100) + extraFeePerKm (50) × (distance − free radius)`.
- Above `maxDistanceKm` (10 km): order rejected ("outside delivery zone").
- Café coordinates: `-4.0435, 39.6682` (Makadara Rd, Mombasa).

**M-Pesa settings**: shortcode + enabled flag (credentials stay in env).
**Notifications**: toggles for SMS/WhatsApp/email + owner alert phone.

---

## 10. Notifications

All sends are **fire-and-forget**: failures are logged to `notifications` with `status=failed` and never break the caller. Unconfigured providers return `{ ok:false, error:"not configured" }`.

- **SMS** — Africa's Talking (`AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID`): `sendSms`.
- **WhatsApp** — Meta Cloud API templates (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, verify token): `sendWhatsAppTemplate(to, templateName, params)`. Template names used: `order_status_update`, `order_ready`, `out_for_delivery`, `delivered`, `picked_up`, `complaint_resolved` — these must be created/approved in Meta (or the AT sandbox). NOT yet configured.
- **Email** — Resend (`RESEND_API_KEY`): `sendEmail` for receipts.
- Status messages: plain-text (no emojis), contain `{order}`, `{eta}`, `{trackUrl}`, `{reviewUrl}` placeholders.
- **Push**: not implemented (needs FCM).

---

## 11. Realtime, Cache & Queues

### Realtime (Supabase)
- Server emits `order:update` broadcast events on an ephemeral channel (`order-events-<random>`) per order (status changes, payments, rider_location).
- Client `subscribeToOrder(orderId)` joins `order:<id>`; **fallback**: 10 s polling of the track API.
- Requires the project's `orders` (and `rider_locations`) tables added to the `supabase_realtime` publication:
  ```sql
  alter publication supabase_realtime add table orders;
  alter publication supabase_realtime add table rider_locations;
  ```

### Redis (Upstash)
- `cacheGet/Set` — analytics (`analytics:<days>`, 1 h TTL).
- `rateLimit(key, limit, window)` — order creation (5/min/IP), rider location (30/min), etc. **Fails open** when Redis is missing.

### QStash
- Worker: `POST /api/jobs/[job]` with manual `Receiver.verify` (the `verifySignature` helper type doesn't match Next 16's `NextRequest`).
- Used for background notification jobs; env: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.

---

## 12. API Routes (complete list)

### Public
| Route | Methods | Purpose |
|---|---|---|
| `/api/menu` | GET | Active categories + available items with options |
| `/api/menu/[id]` | GET | Single item |
| `/api/orders` | POST | Create order (rate-limited, zod-validated) |
| `/api/orders/track` | GET | Order by number + phone (includes items, rider name/phone) |
| `/api/orders/switch-to-cash` | POST | Convert pending M-Pesa order to cash |
| `/api/payments/mpesa/initiate` | POST | Start STK push |
| `/api/payments/mpesa/callback` | POST | Daraja callback (public, idempotent, recoverable) |
| `/api/payments/status` | GET | Poll STK status (4999 → pending) |
| `/api/reviews` | POST | Create review (order number + phone verified) |
| `/api/complaints` | POST | Create complaint |
| `/api/whatsapp/webhook` | GET/POST | Meta webhook (verify token `WHATSAPP_VERIFY_TOKEN`) |
| `/api/auth/me` | GET | Session role info |
| `/api/jobs/[job]` | POST | QStash worker |

### Admin (`requireRole("owner","admin")`)
| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/orders` | GET/PATCH | List (filters: status/type/q/from/to) + status updates |
| `/api/admin/orders/assign-rider` | POST | Assign/unassign rider |
| `/api/admin/menu` | GET/POST/PUT/DELETE | Categories + items CRUD (image paths relative or absolute) |
| `/api/admin/riders` | GET/POST | Riders + candidates; add by email (Clerk lookup) or clerkId |
| `/api/admin/locations` | GET | Fleet: each rider's latest location (no cutoff) + active order |
| `/api/admin/analytics` | GET | Dashboard data (`?days=7/30/90`, Redis-cached) |
| `/api/admin/reviews` | GET/PATCH | List + moderation (`isVisible`) |
| `/api/admin/complaints` | GET/PATCH | List by status + resolve/assign |
| `/api/admin/settings` | GET/PUT | Settings (PUT requires owner) |

### Rider (session with DB-linked user)
| Route | Methods | Purpose |
|---|---|---|
| `/api/rider/orders` | GET | Assigned, non-terminal orders + items |
| `/api/rider/orders/[id]` | PATCH | Status update (must be assigned rider, or owner/admin) |
| `/api/rider/location` | GET/POST | Latest location for an order (GET, public by orderId); POST broadcasts (auth + order-assignment verified, rate-limited) |

### Webhooks
| Route | Purpose |
|---|---|
| `/api/webhooks/clerk` | svix-verified user sync (create/update/delete) |

---

## 13. Order Tracking & Maps

### Customer (`/track/[orderNumber]`)
- Lookup by **order number + phone** (both required).
- Visual status timeline with animated dots; auto-polls every 10 s; subscribes to Supabase realtime.
- **Live Delivery Map** (Google Maps) for delivery orders, shown from `confirmed` onward:
  - Amber **C** = café, teal dot = delivery point, blue dot = rider (when sharing).
  - Driving route from the rider (or from the café before they move).
  - ETA bar: "~X min · X km away" (haversine + 28 km/h assumption).
  - Rider card: name, masked phone (`07**`), call button (data from `trackOrder` join).
- M-Pesa "retry" hint, review link after delivery, complaint link, WhatsApp help link.

### Rider (`/rider`)
- Card per assigned order: items, address, map (their device → customer, distance + ETA), status buttons, Navigate (Google Maps deep link), Call customer.
- **Share live location** (visible at `ready` and `out_for_delivery`): toggles GPS broadcasting every 15 s to `/api/rider/location`; green pulsing "Sharing live" indicator; clear error messages for permission-denied vs network failures.
- Rider auth: `getUserRole()` → `/api/auth/me`; DB-linked user required (owner must add the rider first).

### Admin fleet (`/admin/map`)
- Live Map page: all riders as blue dots + café marker; auto-refresh 15 s.
- Rider cards: Live/Offline, "Last seen X min ago" (staleness-aware — no time cutoff on the API), active order + status + address.
- Admin → **Riders** page also shows each rider's sharing status and last-seen.

---

## 14. Admin Dashboard (pages)

`/admin` (owner/admin only):
- **Overview** — summary cards, recent orders, open complaints, latest reviews.
- **Orders** — kanban columns by status; search/filter; per-card: items, paid badge, tip, rider selector, transition buttons (only allowed transitions shown); 15 s auto-refresh.
- **Menu** — full category/item CRUD: name, price, prep time, flags (popular/veg/spicy), options editor, availability toggle, delete confirmation, **drag-and-drop image upload** (Supabase Storage) or URL.
- **Riders** — add riders by **email** (Clerk lookup, no dashboard visits) or one-click promote from "Signed-up accounts"; per-rider: deliveries, last seen.
- **Live Map** — fleet positions.
- **Analytics** — 7/30/90-day: daily sales (orders vs revenue), peak hours, payment/order-type pies, top items, rider performance, repeat rate, average rating.
- **Reviews** — show/hide moderation (PATCH `isVisible`).
- **Complaints** — status, assignment to staff, resolution notes; sends WhatsApp template on resolution.
- **Settings** — business info + hours, delivery pricing, M-Pesa shortcode/toggle, notification toggles (PUT requires owner role).

Mobile admin uses a bottom icon nav; desktop a left sidebar.

---

## 15. Customer Experience (pages & flows)

- **Home** — dark photo hero (logo, serif headline, signature chips), Most Loved Dishes (popular items with photos), category showcase cards (link to `/menu?category=slug`), experience/3-step sections, reviews, CTA.
- **Menu** (`/menu`) — Glovo-style: sticky search + filter pills, desktop left category sidebar with scroll-spy, item rows (photo, name, desc, price, quantity stepper that appears on add), mobile horizontal category chips; items with options open the customize dialog; floating cart bar appears when cart is non-empty.
- **Cart** — slide-in drawer with quantity steppers, **tip selector (No tip / 50 / 100 / 200**, persisted), totals incl. tip, "Place order · KES X".
- **Checkout** — name, phone (formatted/validated), email, order-type (delivery/pickup/dine-in), Google Places autocomplete (Kenya-restricted) + manual address, delivery fee preview (mirrors server rules, incl. out-of-zone), special instructions, M-Pesa or cash.
  - **M-Pesa state**: masked phone (`07 09****`), 5-minute SVG progress ring countdown, "Check status" / "Try again" / "**Pay cash on delivery**", success → confetti → redirect to tracking.
- **Track** — see §13.
- **Review** (`/review/[orderNumber]`) — star rating + comment, phone-verified.
- **Complain** (`/complain`) — category + description, phone/order verified.
- **Contact** — business info + Google Maps embed (iframe, no key needed).
- **My Orders** (`/account`) — signed-in customers: orders matched by linked account **and** phone; per order: status badge, items, total, Track / Review / Issue? / Order again.
- **PWA** — manifest (`/manifest.ts`), install icons, standalone display; offline service worker NOT implemented.

**Guest flow**: everything above except My Orders works without an account.

---

## 16. Brand, Design & Assets

- **Colors** (`globals.css` CSS vars, light + dark): primary `#D97706` (amber), secondary `#0F766E` (teal), background `#FFFBF5` (cream), foreground `#1F2937`, accent cream, success `#16A34A`, destructive `#DC2626`. Dark theme included.
- **Fonts**: Geist (sans), Playfair Display (`font-display`).
- **Assets**: `public/logo.png` (extracted from the official PDF, background flood-removed, transparent), 18 real dish photos in `public/food/` used as category/item images and hero/CTA backgrounds.
- **No emojis anywhere** — all icons via lucide-react (a deliberate purge was done; includes notification templates).
- **Animations**: framer-motion entrance/stepper/bounce; `prefers-reduced-motion` globally respected; `tabular-nums` utility for prices/IDs.

---

## 17. Menu Data & Seeding

- `npm run db:seed` (**tsx src/db/seed.ts**) — **wipes and rebuilds** `menu_items` + `categories` from the official PDF data, then seeds owner user (`254706090909`, role owner) + default settings.
- **18 categories**, ~237 items with exact PDF prices: Breakfast, Snacks & Sandwiches, Starters & Fries, Main Course Specials, Pasta & Soups, Salads & Curries, BBQ & Grills, Seafood, Barbecue & Tikka, Burgers, Pizzas, Tea & Coffee, Iced Drinks & Coolers, Mocktails & Mojitos, Smoothies & Shakes, Juices & Soft Drinks, Ice Cream & Fruit, Cakes (slice/per-kg options).
- Popular flags on signature dishes; options where the menu offers choices (single/double coffee, cake slice/kg, mojito flavours, etc.).

---

## 18. Environment Variables (`.env.local` + Vercel)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres — use the **Supabase transaction pooler** (`postgresql://postgres.<ref>:<pw>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`). `sslmode` is stripped in code; SSL is set explicitly (§12.8) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Realtime + Storage |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Auth (sign-in URLs + after-sign-in/up URLs preconfigured) |
| `CLERK_WEBHOOK_SECRET` | svix verification for `/api/webhooks/clerk` |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_PASSKEY` | Daraja |
| `MPESA_SHORTCODE` | `174379` sandbox; your paybill in production |
| `MPESA_ENV` | `sandbox` \| `production` |
| `MPESA_CALLBACK_BASE_URL` | Public HTTPS base; app appends `/api/payments/mpesa/callback` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JS + Places + Directions |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_VERIFY_TOKEN` | Meta WhatsApp (optional) |
| `AT_API_KEY` / `AT_USERNAME` / `AT_SENDER_ID` | Africa's Talking SMS (optional) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Cache + rate limits (optional, fail-open) |
| `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` | Background jobs (optional) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Reserved (uploads use Supabase Storage instead) |
| `RESEND_API_KEY` | Email receipts (optional) |
| `NEXT_PUBLIC_SENTRY_DSN` | Reserved |

`.env.local` is git-ignored. **Every key must ALSO exist in Vercel → Settings → Environment Variables** (the deployed site has its own env).

---

## 19. Development & Verification Workflows

```bash
npm run dev            # local dev (Turbopack)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (0 errors; set-state-in-effect downgraded to warn intentionally)
npm run build          # production build
npm run db:push        # apply schema to the DB (use --force for non-interactive)
npm run db:seed        # rebuild menu + owner + settings
npm run db:generate    # new migration from schema changes
npm run db:studio      # Drizzle Studio UI
```

- Local Postgres alternative: `docker-compose up -d` (not installed on this machine; Supabase is the live DB).
- **Verified end-to-end**: typecheck ✓, lint ✓ (0 errors), production build ✓ (36 routes), dev server boots ~3 s, order → track → payment-status round trips tested against the live Supabase DB.

---

## 20. Deployment (Vercel)

- Git-connected to GitHub (`main` branch auto-deploys). Production URL: `https://amorino-five.vercel.app`.
- Set region **Frankfurt (`fra1`)** in project settings (lowest latency from Kenya); DB region `eu-central-1`.
- Env vars: see §18 — after changing them, **Redeploy**.
- Middleware must stay at `src/middleware.ts` (Next 16 requirement).
- **Known pitfalls experienced** (all fixed in code, but useful context):
  1. `DATABASE_URL` must be the pooler (IPv4) host — the direct `db.<ref>.supabase.co` host is IPv6-only on some networks → `ENOTFOUND`.
  2. **Supabase pooler caps this project at 15 connections** — pools must be tiny (`max: 2`, 10 s idle) or every DB query (including auth role lookups → 401s) starts failing. Symptoms: intermittent `EMAXCONNSESSION` errors, random 401s, blank menu.
  3. Free tier **autosuspends the DB** after ~5 min idle → first query after a pause pays a 3-10 s cold start; `connectionTimeoutMillis: 20000` handles it.
  4. Client components must never import from server-only modules (`lib/orders`, `lib/db`) — bundle-leak builds fail with `module not found` (dns/net/tls). Use `src/types` for shared constants and `lib/utils`/`lib/coords` for client-safe helpers.
  5. Clerk metadata changes need a re-issued token — mitigated by the DB role fallback (§5).

---

## 21. Known Limitations & Roadmap

- **Not configured yet**: WhatsApp/Meta (template approval needed), Africa's Talking SMS, Resend, QStash usage (worker exists), Cloudinary.
- **M-Pesa**: production go-live still pending (sandbox + a live paybill for testing only).
- **Push notifications** (FCM) — not implemented; polling + Supabase realtime cover updates.
- **Offline PWA / service worker** — not implemented (cart persists in localStorage only).
- **Per-item ratings** — reviews are per-order; no per-item aggregation schema.
- **AI features** — planned via hosted APIs (Gemini/Groq — OpenAI unavailable in Kenya); recommendations should be built from own order data. See plan §0/AI notes.
- **Scale ceiling** — free tiers: Supabase ~15 pooler connections & 500 MB storage, Vercel Hobby 1M invocations/mo, Resend 3k emails/mo. Upgrade paths: Supabase Pro / Neon Launch, Vercel Pro, and reduce polling intervals at scale (tracker 10 s → 30 s when realtime is primary).
- The checkout page keeps a client-side copy of the delivery-fee rule (must stay in sync with `calculateDeliveryFee`).
- `api/admin/orders` returns up to 100 orders and ignores `?limit=` (by design for now).

---

## 22. Testing Playbook

1. **Local sanity**: `npm run typecheck && npm run lint && npm run build`; `npm run dev` → home/menu/track/contact all 200.
2. **Order round-trip**: add items → cart → checkout → cash order → order appears in `/admin/orders` → confirm → prepare → ready → assign rider → out for delivery → delivered; customer tracking page follows each step.
3. **M-Pesa sandbox**: initiate with `254708374149` → sandbox auto-approves → callback flips to paid (allow up to a minute; polling covers gaps).
4. **Roles**: sign up (email), set `{"role":"owner"}` in Clerk (or use the DB fallback), add a rider via Admin → Riders (email lookup) → rider signs in → `/rider`.
5. **Live tracking**: delivery order → out for delivery → rider toggles Share live location (phone, permission granted) → blue dot on customer map + admin Live Map within 30 s; verify `rider_locations` rows in the DB.
6. **Diagnostics**: `/api/auth/me` shows session role; `/api/admin/riders` shows riders/candidates/last-seen; Vercel Runtime Logs show server errors; the `notifications` table records every send attempt.
