# Family Pack in-app purchase — owner setup runbook

The app code is DONE and dormant: store builds show the native purchase
sheet for the Family Pack as soon as the two RevenueCat keys are set at
build time. Until then, native builds show the redeem-code field only,
and the web keeps its payment-link + honor flow. This document is the
one-time setup on your side. Budget ~1-2 hours, mostly console clicking.

The moving parts:

- Product id (both stores): `family_pack` (non-consumable / managed product)
- RevenueCat entitlement: `family_pack`
- Env vars at build time: `VITE_REVENUECAT_APPLE_KEY`, `VITE_REVENUECAT_GOOGLE_KEY`
- Price: $4.99 (Apple price point / Play per-country equivalent). The app
  never hardcodes it - the button shows the store's localized price.

## 1. App Store Connect (Apple)

1. Make sure your Paid Applications agreement, banking, and tax forms are
   active (Agreements, Tax, and Banking) - IAP cannot be tested without it.
2. My Apps -> eGeez -> Monetization -> In-App Purchases -> `+`.
   - Type: **Non-Consumable**
   - Reference name: `Family Pack`
   - Product ID: `family_pack`
   - Price: $4.99 tier
   - Localization (English): Display name `Family Pack`, description
     `Profiles for every child in the family on this device.`
   - Add a review screenshot later (any screenshot of the Grown-Ups
     Children card is fine); submit the IAP together with the next app
     version.
3. Xcode: open the App target -> Signing & Capabilities -> `+ Capability`
   -> **In-App Purchase** (one click; commit the project change).
4. Create a **Sandbox tester** (Users and Access -> Sandbox) for testing.

## 2. Google Play Console

1. Monetization setup must be complete (payments profile).
2. eGeez -> Monetize -> Products -> In-app products -> Create.
   - Product ID: `family_pack`
   - Name: `Family Pack` / description as above
   - Price: $4.99 (auto-converts per country; round if you like)
   - Activate it.
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
3. Product catalog -> Products: add `family_pack` for BOTH stores.
4. Entitlements: create entitlement `family_pack` and attach both
   products to it. (The app checks this exact entitlement id.)
5. Offerings: the default offering, one package, containing the product
   for each store. (The app buys the first package of the current
   offering.)
6. Copy the two public SDK keys (Project settings -> API keys):
   `appl_...` and `goog_...`.

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

No key = the exact behavior you have today (redeem-code only). Wrong key
= buttons show "store did not respond"; nothing breaks.

## 5. Test before rollout

- iOS: run from Xcode on a device signed into the Sandbox tester ->
  Grown-Ups -> Children -> Get the Family Pack -> the Apple sheet should
  show $4.99 and complete. Delete + reinstall -> the pack restores on
  launch (or via Restore purchase).
- Android: internal/closed-track build with a license-tester account ->
  same flow through the Google sheet.

## Notes

- Refunds: handled by the stores; RevenueCat revokes the entitlement,
  but the app only re-checks on launch/restore - acceptable for a $4.99
  family unlock.
- The web flow and FAM redeem codes stay live regardless; they carry no
  store commission and serve community grants.
- Small Business Program (Apple) / 15% service fee tier (Google): enroll
  in both so the cut is 15%, not 30%.
