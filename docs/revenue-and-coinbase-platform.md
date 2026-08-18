# Revenue audit + Coinbase platform fit (eGeez)

Investigation, August 2026. Scope: this repo only — the app (`src/`), the
hub website (`website/`), and the hub API (`api/`).

Question asked: what income mechanisms exist, and does the Coinbase agent
platform (AgentKit, Agentic Wallets, x402, Commerce, Onramp) add anything
worth building here.

Standing constraint that shapes every answer: **eGeez is a children's
product.** Nothing crypto-shaped may ever appear in the child app or any
child-facing surface. Every idea below lives on the adult side only — the
hub website checkout and teacher/parent accounts — the same place Stripe
already lives.

---

## Part 1 — What exists today

Verified by reading the code, not the docs alone. There is currently **no
crypto code anywhere in this repo** (the only `crypto` imports are
`node:crypto` for hashing/randomness).

| Mechanism | Where | Price | State |
| --- | --- | --- | --- |
| Web checkout: full app | `api/routes/pay.js` (`product: 'app'`) | $12.99 → EGZ unlock code | Built, **dormant** — no `STRIPE_SECRET_KEY` |
| Web checkout: Family Pack | `api/routes/pay.js` (`product: 'family_pack'`) | $4.99 → FAM unlock code | Built, **dormant** — same keys |
| Native IAP: Family Pack | RevenueCat, `family_pack` entitlement | $4.99 store-native | Built, **dormant** — the two `VITE_REVENUECAT_*` keys unset (`docs/family-pack-iap.md`: ~1–2h of console work) |
| Teacher board + intros | `api/routes/intros.js`, `website/src/pages/Teachers.jsx` | free | Live design, **no take rate** |
| Community partner kit | `docs/partner-kit.md` | bulk licenses / affiliate seats | Design; store-native, no payout plumbing |

Two structural facts worth naming:

- **Fulfillment is already payment-agnostic.** The Stripe flow's whole job
  is "money in → mint an EGZ/FAM code idempotently → email it"
  (`createOrderIfAbsent`, webhook-vs-poll race handled). The unlock-code
  system is offline and store-independent by design. Any new payment rail
  plugs into that same mint step; the app never changes.
- **The accounts base was built to carry booking.** `api/README.md` calls
  auth "the foundation the teacher directory and booking will build on."
  The intro flow brokers contact but takes no money — the marketplace has
  distribution value and zero monetization on it.

Same pattern as elsewhere in the portfolio: **the revenue mechanisms exist
and are switched off.** Everything below is ranked accordingly.

---

## Part 2 — Ranked actions

### 1. Flip on the two dormant payment paths (hours, not weeks)

Pure console work, both fully runbooked:

- Stripe web checkout: `docs/go-live.md` steps 1–3 (Mongo + SMTP are the
  real blockers; Stripe keys + one webhook after that).
- Native Family Pack IAP: `docs/family-pack-iap.md` end to end
  (App Store Connect + Play Console + RevenueCat, ~1–2 hours).

Nothing else on this list matters until money can physically arrive.

### 2. Marketplace take rate — the actual income engine

The teacher board is the only surface here with recurring-revenue shape.
Today eGeez brokers the introduction and steps out; the lesson money (and
the relationship) leaves the platform immediately.

The standard move: keep intros free, add **optional booked-and-paid
lessons** on top — parent pays through the platform, platform keeps
10–15%, teacher gets protection (no-show policy, review credibility,
board ranking that favors on-platform completion). Stripe Connect Express
accounts for teachers in supported countries; the existing `intros`
accept-flow is the natural upgrade point ("teacher accepted — book a
first lesson?").

At 50 active teachers × 4 lessons/week × $20 × 12% that is ~$500/week —
small, but it compounds with the partner-kit distribution channel
(`docs/community-teacher.md` phase 1), and it is the only mechanism here
that scales past one-time unlock codes.

### 3. USDC checkout via Coinbase Commerce — the genuine Coinbase fit

The one Coinbase product that maps cleanly onto this repo is the boring
one: **Coinbase Commerce as a second checkout rail**, next to Stripe, on
the hub website's Pricing page.

Why it earns a place:

- The audience is the Ethiopian/Eritrean **diaspora buying for family** —
  including buyers whose cards fail on a US Stripe checkout, and gift
  purchases aimed at relatives in-country. A payment link that accepts
  USDC/crypto works from anywhere and settles to USDC.
- Fee is a flat **1%** (vs. ~2.9% + $0.30 on Stripe — on a $4.99 Family
  Pack that is meaningfully different).
- Integration is small *because of* the payment-agnostic fulfillment: a
  `pay-crypto.js` route that creates a Commerce charge and reuses the
  exact `createOrderIfAbsent` mint-and-email step. Same dormant-until-keys
  convention (`COINBASE_COMMERCE_API_KEY`).
- **Web only.** Store builds keep IAP/redeem-code exactly as-is — an
  external crypto checkout inside a native kids' app would be both a
  store-compliance and an audience problem. The web checkout already
  carries the "buy on web, redeem anywhere" posture; this inherits it.

### 4. USDC teacher payouts where Stripe cannot reach — investigate, do not build yet

The teacher marketplace (#2) has a hard geographic problem: **Stripe has
no merchant/payout support in Ethiopia, and Eritrea is explicitly
unsupported** (US-regulation category). Diaspora-to-diaspora lessons work
on Stripe Connect; paying a teacher *in* Addis or Asmara does not.

Coinbase Business launched global USDC payouts and payment links, which is
technically the missing rail: parent pays in USD, teacher receives USDC.

Flag, in bold, before anyone builds this: **Ethiopia's central bank has
historically prohibited crypto as a means of payment**, and the regulatory
posture is in flux; Eritrea is a US-sanctions-adjacent jurisdiction where
extreme care is required. This is a talk-to-counsel item per corridor, not
a weekend feature. Until then, the honest scope of #2 is
diaspora-teacher-to-diaspora-family, which is where the paying demand is
anyway.

(Note: `stripe.com` and `docs.cdp.coinbase.com` were blocked by this
environment's egress proxy — the country-support claims above come from
secondary sources and should be re-verified before committing.)

### 5. What does NOT fit — AgentKit, Agentic Wallets, x402

Honest assessment, since the question specifically asked about the agent
platform:

- **Agentic Wallets / AgentKit:** built for autonomous agents holding
  funds and acting on-chain. This repo has no on-chain anything, no
  operator hot keys, no treasury to protect, and its product is a
  fully-offline PWA for children. There is no place for an agent wallet
  that is not invented purely to use one.
- **x402:** a metered-API monetization tool. The hub API's endpoints are
  forms and account plumbing — nothing an agent would pay per-call for.
  The app's unique assets (fidel data table, letter audio, timing maps)
  are the product itself, not a dataset to meter. The only conceivable
  hook — an x402 endpoint that sells gift unlock codes to AI agents
  ("agentic gifting") — costs an afternoon but has near-zero expected
  demand today (x402 network volume was ~$28k/day in March 2026, largely
  test traffic). File under "cheap novelty, only after 1–3 exist."

The Coinbase products that matter for eGeez are the unglamorous merchant
ones (Commerce, Business payouts), not the agent ones.

---

## Sequence

1. **Go-live runbook** — Mongo, SMTP, Stripe keys, RevenueCat keys
   (`docs/go-live.md`, `docs/family-pack-iap.md`). Hours of console work;
   turns three built products into live products.
2. **Partner kit** — distribution before monetization; it feeds everything
   downstream (`docs/partner-kit.md`).
3. **Marketplace booking + take rate** — design doc first (extends
   `community-teacher.md`), Stripe Connect Express, diaspora corridors
   only.
4. **Coinbase Commerce checkout** — small PR against `api/routes/`,
   dormant-until-key, web-only.
5. **USDC in-country payouts** — legal review first; park until #3 proves
   demand.

## Sources

- [Coinbase Commerce fees — 1% flat](https://help.coinbase.com/en/commerce/getting-started/fees)
- [Coinbase Commerce review 2026](https://thefinrate.com/coinbase-commerce-review-2026-pricing-pros-cons/)
- [Coinbase Business: global USDC payouts + payment links](https://www.coinbase.com/blog/introducing-a-powerful-suite-of-business-payment-tools-on-coinbase-business)
- [Stripe global availability](https://stripe.com/global) (blocked from this environment; verify)
- [Stripe-unsupported countries incl. Eritrea](https://help.fourthwall.com/frequently-asked-questions/payments-and-pricing/country-not-supported-by-stripe)
- [x402 demand reporting, CoinDesk, March 2026](https://www.coindesk.com/markets/2026/03/11/coinbase-backed-ai-payments-protocol-wants-to-fix-micropayment-but-demand-is-just-not-there-yet)
