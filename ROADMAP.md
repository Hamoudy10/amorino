# Amorino Café — Implementation Roadmap

> Working plan derived from the Improvement & Feature Roadmap (v2.0).
> **AI stack decision**: DeepSeek (OpenAI-compatible API) replaces Google Gemini for all
> AI features — DeepSeek is available in Kenya, has a pay-as-you-go API, and the
> `deepseek-v4-flash` model is fast/cheap for recommendations and chat.

Priority legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Nice-to-have · [S] days · [M] 1–2 wks · [L] 2–4 wks · [XL] >1 month

---

## Month 1 — Revenue & Reliability

| # | Feature | Prio | Size | Status |
|---|---|---|---|---|
| 1 | Activate WhatsApp templates + two-way replies | 🔴 | [S] | Needs Meta approval + creds |
| 2 | Activate Africa's Talking SMS (+ SMS fallback when WhatsApp fails) | 🔴 | [S] | SMS fallback code: **DONE** |
| 3 | Resend email receipts (itemised branded template) | 🔴 | [S] | Needs creds + template |
| 4 | M-Pesa production go-live + reconciliation job + /admin/payments | 🔴 | [M] | /admin/payments code: **DONE**; go-live operational |
| 5 | Activate QStash jobs (review request, abandoned payment, idle order, rider check-in) + /admin/jobs | 🔴 | [S] | Code: **DONE**; needs QStash creds in Vercel |
| 6 | Sentry error monitoring | 🟠 | [S] | Needs DSN |
| 7 | Staging environment (branch + separate Vercel/Supabase) | 🟠 | [S] | Operational |
| 8 | Custom domain amorino.co.ke + SSL + callback URL update | 🟠 | [S] | Operational |
| 9 | Upgrade Supabase to Pro (pool 15→60, no autosuspend, PITR) | 🔴 | [S] | Operational (~$25/mo) |
| 10 | Printable Kitchen Order Ticket (KOT) | 🟠 | [S] | **DONE** |

## Month 2 — Customer Experience

| # | Feature | Prio | Size | Status |
|---|---|---|---|---|
| 11 | Coupon / discount codes | 🟠 | [M] | Planned |
| 12 | Saved delivery addresses | 🟠 | [M] | Planned |
| 13 | Card payments (Pesapal/Flutterwave) | 🟠 | [M] | Planned |
| 14 | Per-item ratings & reviews | 🟠 | [M] | Planned |
| 15 | Allergen & dietary filters | 🟠 | [M] | Planned |
| 16 | PWA service worker + offline menu + install prompt | 🟠 | [M] | Planned |
| 17 | Order scheduling (pre-orders) | 🟡 | [M] | Planned |
| 18 | Real-time admin sound alerts + mute | 🟠 | [S] | **DONE** |
| 19 | Menu full-text search + autocomplete | 🟡 | [S] | Planned |
| 20 | One-click reorder | 🟠 | [S] | **DONE** |
| 20b | Tip split tracking (rider/house) | 🟡 | [S] | **DONE** |
| 20c | Rate limiting (reviews/complaints/initiate) | 🟠 | [S] | **DONE** |
| 20d | Menu Redis caching + invalidation | 🟡 | [S] | **DONE** |

## Month 3 — Growth & Intelligence

| # | Feature | Prio | Size | Status |
|---|---|---|---|---|
| 21 | Loyalty points programme (tiers, redemption) | 🟠 | [L] | Planned |
| 22 | Firebase push notifications | 🟠 | [M] | Planned |
| 23 | **AI recommendations via DeepSeek** + craving input | 🟠 | [M] | Scaffold: **DONE**; needs `DEEPSEEK_API_KEY` |
| 24 | Rider earnings dashboard (deliveries, km, tip share) | 🟠 | [M] | Planned |
| 25 | Rider availability toggle + assignment filter | 🟠 | [S] | Planned |
| 26 | Inventory / stock management | 🟡 | [L] | Planned |
| 27 | Customer segmentation page + campaigns | 🟡 | [M] | Planned |
| 28 | Playwright E2E test suite | 🟠 | [M] | Planned |
| 29 | OTP verification for guest orders | 🟡 | [M] | Planned |
| 30 | Swahili language support (next-intl) | 🟡 | [L] | Planned |

## Backlog (all remaining roadmap items)

- Card payments §2.1, Refunds workflow §2.3, Group ordering §4.4, Order receipt page §4.6,
  Referral programme §5.2, Birthday rewards §5.4, Smart prep-time estimation §6.3,
  Complaint auto-categorisation §6.4, Daily ops report §7.3, Inventory §7.4, Role granularity §7.5,
  Bulk order ops §7.6, Revenue forecasting §7.7, Multi-order routing §8.2, Proof of delivery §8.4,
  Rider↔kitchen chat §8.5, Combos §9.3, Upsell at cart §9.4, Seasonal menu §9.6, Share API §10.3,
  Image optimisation §11.2, Query optimisation §11.3, Pagination §11.4, GPS polling tuning §11.6,
  CSP §12.1, Key rotation §12.3, Audit log enhancements §12.4, Phone verification §12.5,
  Data-protection compliance §12.6, Unit tests §13.2, Storybook §13.3, Improved seed §13.5,
  Mock services §13.6, Backup strategy §15.2, CDN §15.4, Log aggregation §15.5,
  Delivery heatmap §16.2, Menu engineering matrix §16.3, Keyboard/ARIA audit §17.1,
  High-contrast/font controls §17.3.

---

## AI Features — DeepSeek Specification (replaces Gemini)

### 23a. AI Menu Recommendations (first)
- **Endpoint** `POST /api/ai/recommend` — body `{ preferences?: string, budget?: number, phone?: string }`.
- Data path: if the customer has order history (by phone/account), return
  "customers who ordered X also ordered Y" co-occurrence from `order_items` (no LLM needed).
- LLM path (DeepSeek): system prompt contains the live menu JSON (name, price, description,
  veg/spicy flags, category); user prompt = the craving text + optional budget.
  Response is JSON `{ items: [{ name, price, reason }] }` validated with zod.
- **DeepSeek client** (`src/lib/deepseek.ts`):
  - `DEEPSEEK_API_KEY` env; base URL `https://api.deepseek.com`; OpenAI-compatible
    `POST /chat/completions`; model from `DEEPSEEK_MODEL` (default `deepseek-v4-flash`).
  - 15 s timeout, `response_format: { type: "json_object" }` when supported, temperature 0.4.
  - Fail-open: on error, fall back to the co-occurrence/recommendation SQL path or empty list.
- **UI**: "Tell us what you're craving" input on `/menu` (desktop header area / mobile bottom
  sheet); results rendered as menu rows with "Add" buttons; loading skeleton; error → hide.
- **Rate limit**: 20 requests/hour/IP via Redis.

### 23b. AI Order Assistant (chat widget) — later phase
- Floating chat button; `POST /api/ai/chat` streams DeepSeek responses (menu injected as
  context); "Add to cart" action buttons on identified items; WhatsApp fallback link.
- Cache frequent Q&As in Redis (5 min); never let chat block checkout flows.

### 23c. Future AI uses
- Complaint auto-categorisation (§6.4), smart prep-time estimation (§6.3) — both use the
  same DeepSeek client; keep all calls out of critical paths.

---

## New Environment Variables

| Variable | Purpose |
|---|---|
| `DEEPSEEK_API_KEY` | AI recommendations + chat (DeepSeek API) |
| `DEEPSEEK_MODEL` | Model name, default `deepseek-v4-flash` |
| `GEMINI_API_KEY` | **NOT used** — removed from AI plans |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring |
| `FCM_PROJECT_ID` / `FCM_CLIENT_EMAIL` / `FCM_PRIVATE_KEY` | Push notifications |
| `FLUTTERWAVE_PUBLIC_KEY` / `FLUTTERWAVE_SECRET_KEY` / `FLUTTERWAVE_HASH` | Card payments |
| `MOCK_INTEGRATIONS` | Dev-only mocks (never in production) |
| `NEXT_PUBLIC_APP_URL` | Canonical URL (replace hardcoded domain) |

## Required Package Additions

```bash
npm install @sentry/nextjs @google/generative-ai  # (generative-ai NOT needed — DeepSeek is OpenAI-compatible)
npm install -D vitest @vitest/coverage-v8 @playwright/test
npm install next-intl @react-email/components react-email firebase firebase-admin
```

> DeepSeek uses the OpenAI-compatible chat completions API — no vendor SDK required;
> a thin fetch wrapper in `src/lib/deepseek.ts` is sufficient.

---

## Working Notes

- **AI provider choice**: DeepSeek v4 Flash via `https://api.deepseek.com` (OpenAI-compatible).
  Selected over Gemini because: available in Kenya, no credit-card wall for access,
  token-cheap for repeated recommendation calls. Fallback always = rule-based SQL
  recommendations from order history.
- Update this document whenever a roadmap item ships (flip status to **DONE**).
- Owner actions needed (operational, no code): WhatsApp/Meta approval, AT sender ID,
  Resend domain verification, Daraja go-live, Supabase Pro, custom domain, staging.

