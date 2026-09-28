# Family Pack in-app purchase — owner setup runbook

The store download is free. Two one-time products sell inside the app once
the RevenueCat public SDK keys are present in the native build:

- App unlock. Entitlement id `full_app` (the string the app checks). The
  store product id is not a separate constant: any package in the current
  offering whose product id does not contain "family" is the app. Use
  product id `full_app` so it matches the entitlement. Price target $12.99.
- Family Pack. Product id `family_pack` on both stores. Entitlement id
  `family_pack`. Price target $4.99.

Env vars at build time: `VITE_REVENUECAT_APPLE_KEY` (`appl_...`),
`VITE_REVENUECAT_GOOGLE_KEY` (`goog_...`). A `test_...` key talks only to
RevenueCat's Test Store and never creates an App Store or Play sale.

The app does not buy "the first package". Each button buys the matching
package. Both packages have to be in the current offering. If only
`family_pack` is there, Buy the app does nothing rather than charging the
Family Pack.

Web and PWA builds never call RevenueCat. They sell through the website
(Stripe) when that API is configured, and redeem an EGZ / FAM code.

## 1. App Store Connect (Apple)

1. Make sure your Paid Applications agreement, banking, and tax forms are
   active (Agreements, Tax, and Banking) - IAP cannot be tested without it.
2. My Apps -> eGeez -> Monetization -> In-App Purchases -> `+`, twice.
   - Type: **Non-Consumable** for each.
   - App unlock: reference name `eGeez`, product ID `full_app`, price
     $12.99. Entitlement the app checks: `full_app`.
   - Family Pack: reference name `Family Pack`, product ID `family_pack`,
     price $4.99. Entitlement the app checks: `family_pack`.
   - Localization (English) and a review screenshot for each. Submit the
     IAPs with the next app version. Both must be Cleared for Sale.
3. Xcode: open the App target -> Signing & Capabilities -> `+ Capability`
   -> **In-App Purchase** (one click; commit the project change).
4. Create a **Sandbox tester** (Users and Access -> Sandbox) for testing.

## 2. Google Play Console

1. Monetization setup must be complete (payments profile).
2. eGeez -> Monetize -> Products -> In-app products -> Create, twice.
   - Product IDs: `full_app` and `family_pack` (same ids as Apple).
   - Prices: $12.99 and $4.99 (auto-converts per country).
   - Activate both. A draft product cannot be purchased.
3. IAP testing on Android requires the build to be on a testing track
   (your closed track works) and the tester's Gmail added under
   Play Console -> Settings -> License testing.

## 3. RevenueCat (free at your scale)

1. Create an account at app.revenuecat.com -> New project `eGeez`.
2. Add two apps to the project:
   - Apple App Store app: bundle id `net.promisechain.fidelquest`.
     Upload the App Store Connect **In-App Purchase key** (App Store
     Connect -> Users and Access -> Integrations -> In-App Purchase) as
     instructed on the RevenueCat screen.
   - Google Play app: package `net.promisechain.fidelquest`. Follow their
     wizard to create/upload a Play service-account JSON with the two
     read permissions it lists.
3. Product catalog -> Products: add `full_app` and `family_pack` for BOTH
   stores, and import them from App Store Connect / Play so the store
   product ids match.
4. Entitlements: create `full_app` and attach the `full_app` products.
   Create `family_pack` and attach the `family_pack` products. The app
   checks these entitlement ids exactly. A product with no entitlement
   can charge the family and still leave the app locked.
5. Offerings: one current offering (mark it Current) with two packages,
   one per product, for each store. If nothing is marked Current and
   there is exactly one offering, the app uses that one. An empty
   current offering makes every buy button report that the store did
   not respond, and RevenueCat records no transaction.
6. Copy the two public SDK keys (Project settings -> API keys):
   `appl_...` and `goog_...`. Do not ship a `test_...` key in a build
   you expect to see in App Store Connect or Play Console sales.

## 4. Build with the keys

The keys are PUBLIC SDK keys (safe to embed). Set them wherever the web
bundle for native builds is produced:

- Local Mac builds: create `.env.local` in the repo root:
  ```
  VITE_REVENUECAT_APPLE_KEY=appl_xxxxxxxx
  VITE_REVENUECAT_GOOGLE_KEY=goog_xxxxxxxx
  ```
  then `npm run build && npx cap sync` as usual.
- Xcode Cloud: add both as custom environment variables on the workflow
  (they flow into `npm run build` via the post-clone script).

No key = the behavior of a build without IAP (the app stays fully free,
no purchase sheet). Wrong key = buttons show that the store did not
respond; the failure is logged as `[iap]` in the device console. A
`test_` key configures successfully and only fills RevenueCat's Test
Store view.

Sandbox purchases (Xcode, TestFlight, license testers) show in RevenueCat
only when the dashboard environment toggle is set to Sandbox. They do
not appear in App Store Connect or Play production sales reports. Live
sales appear only after a production App Store / Play install buys with
a real account, on a build that was compiled with the `appl_` / `goog_`
keys.

## 5. Test before rollout

- iOS: run from Xcode on a device signed into the Sandbox tester ->
  Grown-Ups -> Children -> Get the Family Pack -> the Apple sheet should
  show $4.99 and complete. Delete + reinstall -> the pack restores on
  launch (or via Restore purchase).
- Android: internal/closed-track build with a license-tester account ->
  same flow through the Google sheet.

## Notes

- Refunds: handled by the stores. RevenueCat drops the entitlement. The
  app grants access when that entitlement is active (launch, Restore, or
  the customer-info listener). It does not revoke access that was already
  written on the device, and a redeemed code stays valid.
- The web flow and FAM redeem codes stay live regardless; they carry no
  store commission and serve community grants.
- Small Business Program (Apple) / 15% service fee tier (Google): enroll
  in both so the cut is 15%, not 30%.
