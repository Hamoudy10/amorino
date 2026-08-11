# Amorino Café — Presentation Brief

> Ready-to-use breakdown: current state, limitations, improvements, costs (KES) and
> infrastructure options. Prepared for stakeholder presentation.

---

## 1. What the system does today

### Customers
- Full online menu (237 real items across 18 categories, official Amorino pricing & photos)
- Cart with tips (KES 50/100/200), guest checkout or account
- Payments: **M-Pesa STK push** (sandbox-ready) or **cash on delivery**
- **Live rider tracking on Google Maps** — rider's real-time position, route, ETA, call rider
- Order tracking timeline, one-click reorder, My Orders dashboard, reviews, complaints
- PWA — installable on the home screen, mobile-first design

### Admin (owner)
- Orders kanban board (status machine: paid → confirmed → preparing → ready → out for delivery → delivered), rider assignment
- **KOT printing** (80 mm kitchen tickets)
- Menu management with **drag-and-drop image uploads** (Supabase Storage)
- Riders management (add by email, one-click promote), **live fleet map + delivery heatmap**
- Payments reconciliation page + manual mark-paid override
- **Analytics**: custom date ranges, daily sales, peak hours, payment/order splits, top items,
  rider performance, **7-day revenue forecast**, **menu engineering matrix**, repeat rate, ratings
- **Customer segmentation** (Champions/Loyal/At Risk/Lost/New/One-time) + CSV export
- Reviews: **reply to customers publicly**, choose which reviews display on the homepage
- Settings (delivery pricing, tip split, notifications), background jobs console

### Riders
- Assigned-order dashboard, status updates, **live GPS sharing**, route maps, navigation, call customer

### Architecture
Next.js 16 (Vercel) · PostgreSQL (Supabase) · Clerk auth · M-Pesa Daraja · Google Maps ·
Supabase Realtime · Redis (Upstash) · QStash background jobs · SMS/WhatsApp/email plumbing

---

## 2. Current limitations (honest)

| Area | Limitation |
|---|---|
| Notifications | WhatsApp templates **not yet approved**; SMS/email keys set but channels not live in production |
| M-Pesa | Testing on a live paybill; café needs its **own paybill + Go-Live approval** for real revenue |
| Free-tier ceilings | Supabase: 15 DB connections, 500 MB storage, DB autosuspend delays; Vercel Hobby: 1M requests/mo; **no automated backups** |
| Payments | M-Pesa + cash only — **no card payments** (Pesapal/Flutterwave planned) |
| Missing features | Push notifications (FCM), offline PWA, inventory/stock, coupons, loyalty points, pre-orders/scheduling, Swahili, OTP phone verification |
| Trust & testing | No OTP → guests can type any phone; no automated tests; error monitoring (Sentry) not wired |
| Reviews | Homepage shows reviews only after admin approval (by design) — currently zero approved so static testimonials show |

---

## 3. Improvements needed (priority order)

1. **Activate what's built** (all code done — only credentials/approvals):
   WhatsApp templates (Meta) · Africa's Talking sender ID · Resend domain · QStash 15-min cron · M-Pesa Go-Live
2. **Scale up** when >50 orders/day: Supabase Pro, Vercel Pro
3. **Revenue features**: coupons, loyalty points, card payments, pre-orders
4. **Operations**: inventory, role granularity, automated daily report, backups, staging, Sentry
5. **Growth**: AI recommendations (DeepSeek — API key ready), push notifications, Swahili, E2E tests

---

## 4. Costs (KES)

### Cloud (recommended path)
| Item | Cost |
|---|---|
| Supabase (PostgreSQL) free | **KES 0** |
| Vercel hosting free | **KES 0** |
| Supabase Pro (at scale) | ~KES 3,250/mo |
| Vercel Pro (at scale) | ~KES 2,600/mo |
| Domain amorino.co.ke | ~KES 2,500–4,000/yr |
| Google Maps (free credit) | KES 0 (≈KES 26,000 credit/mo) |
| Email (Resend free 3k/mo) | KES 0 |
| SMS (Africa's Talking) | ~KES 0.75–1.00/msg |
| WhatsApp Business | ~KES 0.50–1.50/msg |
| M-Pesa STK push | ~KES 30 + 0.5–1% per transaction |

**Cloud monthly total: KES 0 → ~KES 7,000/mo depending on order volume.**

### Physical server (buying hardware — not recommended)
| Item | Est. cost |
|---|---|
| Refurbished desktop (i5, 16 GB RAM, 512 GB SSD) | KES 45,000–70,000 |
| UPS (1kVA) | KES 8,000–15,000 |
| Static public IP (ISP add-on) | KES 1,500–3,000/mo |
| Router + cabling | KES 5,000–8,000 |
| External backup drive (1 TB) | KES 7,000–12,000 |
| Electricity | ~KES 1,500–2,500/mo |
| **One-time total** | **≈ KES 70,000–110,000** |

### Verdict
A physical server is **worse for this app**: ~KES 100k upfront, needs 24/7 power + internet
(M-Pesa callbacks arrive at any hour — an outage means lost payments), security hardening and
maintenance. **Cloud (Vercel + Supabase) is correct**: KES 0 to start, ~KES 6–7k/mo at serious
volume. A Kenyan **VPS (~KES 750/mo)** gives "server" control without hardware risk if ever needed.

---

## 5. How to get to production-ready (checklist)

1. Add provider keys to Vercel env: WhatsApp, AT, Resend, QStash cron, DeepSeek
2. M-Pesa Go-Live: café paybill/till + live passkey → `MPESA_ENV=production`
3. Approve WhatsApp templates (6–8 messages)
4. Verify Google Maps key on Vercel + enable Places/Directions/Visualization APIs
5. Approve the first real reviews → homepage shows them
6. Optional: Supabase Pro, custom domain, Sentry, staging

