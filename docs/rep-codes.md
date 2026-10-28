# Representative unlock codes (EGR) + content packages

## What it is
Countries with no workable store payment (much of Africa) buy through a local
eGeez representative. The rep sells a one-time code; the family types it in
**Grown-Ups → "ከወኪል የተገዛ ኮድ / ካብ ወኪል ዝተዓደገ ኮድ"** on the **web app**.

- Format: `EGR-<C|P|B><REPID>-XXXX-XXXX` (C = Core, P = Prayer Book, B = both).
- Server-checked (`POST /api/repcodes/redeem`), single- or limited-use
  (`maxUses`), optional expiry, revocable by batch. Only a sha256 of each code
  is stored. Same device re-entering its own code is fine.
- Rate limit: 20 tries / 15 min per IP.

## Store policy (why web only)
- Apple 3.1.1: digital content may not be unlocked by license keys/codes
  outside IAP. Google Play Payments policy: same, must use Play Billing.
- So the iOS/Android apps never show the code box, rep prices, or links out.
  The native apps sell packages with IAP (PackageOffer) only.
- If reps must serve store-app users, use **Apple Offer Codes** and **Google
  Play promo codes** (both allowed) — those are created in the store consoles.

## Owner runbook
```
export API=https://api.easygeez.com ADMIN_TOKEN=...   # never commit / print
node scripts/rep-codes.mjs add-rep ER01 "Name" ET
node scripts/rep-codes.mjs mint ER01 core 50 --uses 1 --days 365 > er01.csv
node scripts/rep-codes.mjs report ER01
node scripts/rep-codes.mjs revoke <batch>
node scripts/rep-codes.mjs rep-off ER01
```
The API needs `ADMIN_TOKEN` and `MONGO_URL` set on Fly (memory store loses codes on restart).

## Packages (1.4, behind `VITE_PACKAGES=1`)
| key | product id | grants |
|---|---|---|
| core | `core_unlock` | full course |
| prayer | `prayer_book` | all prayer books |
| bundle | `bundle_core_prayer` | both |

Free always: ጸሎት ዘዘወትር + today's ውዳሴ ማርያም. Past paid buyers and teacher class codes → Core.
With the flag off (all current builds) nothing is gated and nothing new is sold.

## Gating details (1.4)
- **Core lock**: School Path unit 1 (or the first 6 path nodes on a pack
  without units) is free; later nodes show a lock badge and open a kid sheet
  (no English, no price: "ask a grown-up" → Grown-Ups, which has its own
  ParentalGate). Free screens without Core: home, Grown-Ups, teacher, join
  class, plan, prayer, Explore, practice log/report, name, family voice,
  placement (`CORE_FREE_SCREENS` in `src/platform/packages.js`).
- **Prayer lock**: ጸሎት ዘዘወትር + today's ውዳሴ ማርያም free on every build; the
  other days show a lock on the shelf.
- **Rep codes are web only**: `repGrants()` returns nothing on a native
  shell, so an EGR grant can never unlock the store apps (3.1.1 / Play
  Payments). Store apps unlock only via IAP, Apple Offer Codes, Play promo codes.

## iOS build (Xcode Cloud)
- Set `VITE_PACKAGES=1` in the 1.4 workflow env. `ci_post_clone.sh` then
  checks the bundle contains `core_unlock`, `prayer_book`, `bundle_core_prayer`.
- `ios/App/App/Products.storekit` is a local StoreKit test config (Xcode →
  Scheme → Run → Options → StoreKit Configuration). It is NOT the store:
  the real products are created in App Store Connect (pending, owner).

## Rep countries (web Grown-Ups order)

`src/platform/repCountries.js` → `REP_COUNTRIES` (edit there; tests pin the owner's core list).
In these countries the **web** Grown-Ups shows the rep code + representatives list first; elsewhere the
store/card buy stays first. Store apps never show rep parts (Apple 3.1.1 / Play billing).

Detection: IANA time zone (country-unique African zones) → else first `navigator.languages` region (e.g. `ti-ER`).
Manual override in Grown-Ups ("How you pay"), stored as `fq.repRegion` = `auto` | `rep` | `store`.

| Code | Country | Why |
|---|---|---|
| ET | Ethiopia | owner list; very low card ownership, telebirr/mobile money dominant; not in Apple's storefront list (verify in App Store Connect) |
| ER | Eritrea | owner list; no App Store storefront, sanctions-era card restrictions, almost no cards |
| UG | Uganda | owner list; storefront exists but mobile money (MTN/Airtel) dominant, few cards |
| AO | Angola | owner list; Multicaixa is domestic-only, international card payments routinely fail |
| SS | South Sudan | no App Store storefront, minimal banking |
| SD | Sudan | no storefront, US sanctions history, card networks largely unavailable |
| SO | Somalia | no storefront, mobile money (EVC/Zaad) economy |
| CD | DR Congo | mobile money dominant, very low card penetration |
| DJ, BI, CF, GN, TG, GQ, KM, LS | Djibouti, Burundi, CAR, Guinea, Togo, Eq. Guinea, Comoros, Lesotho | no App Store storefront (users can't buy in-app at all); several also have very low card use |

Source for storefronts: appavailability.com App Store country list + Apple Community, checked 2026-10-22.
Candidates not added (have storefronts / workable cards, revisit with data): Malawi, Madagascar, Mauritania
(no Google Play paid apps), Chad, Niger.

## Representatives list

`public/representatives.json` (empty `representatives: []` — **no names until each rep agrees to be listed**),
rendered in web Grown-Ups and on the static page `/representatives.html` (Tigrinya/Amharic first, English small).
