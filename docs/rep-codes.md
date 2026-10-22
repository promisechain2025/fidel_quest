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
