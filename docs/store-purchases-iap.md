# Store purchases (in-app) — owner setup runbook

The app code is DONE and dormant. Store builds show the native purchase
sheet as soon as the platform's RevenueCat key is set at build time.
Until then a native build deliberately stays FREE: `iapAvailable()` is
false, so `licenseState()` returns `licensed`, no trial runs, no ask
appears, and only the redeem-code field is offered. The web keeps its
payment-link + EGZ-code flow either way. This document is the one-time
setup on your side. Budget ~1-2 hours, mostly console clicking.

**TWO products, not one.** Since 1.2 the app itself is sold in-app (free
download -> 3-day trial -> buy once), so `full_app` is the one that
actually gates the app. `family_pack` is the optional add-on.

| What | Product id (both stores) | Type | Price | Entitlement |
| --- | --- | --- | --- | --- |
| The app itself | `full_app` | Non-consumable / managed | $12.99 | `full_app` |
| Family Pack add-on | `family_pack` | Non-consumable / managed | $4.99 | `family_pack` |

- Env vars at build time: `VITE_REVENUECAT_APPLE_KEY`, `VITE_REVENUECAT_GOOGLE_KEY`
- The app never hardcodes a store price - each button shows the store's
  own localized price string.
- The app picks a package out of the current offering by matching the
  product identifier against `/family/i`: anything containing "family" is
  the add-on, anything else is the app. So do NOT put the word "family"
  in the `full_app` product id.

## 1. App Store Connect (Apple)

1. Make sure your Paid Applications agreement, banking, and tax forms are
   active (Agreements, Tax, and Banking) - IAP cannot be tested without it.
2. The app's own price must be **Free** (Pricing and Availability). The
   download is free; the app is sold by `full_app` inside it.
3. My Apps -> eGeez -> Monetization -> In-App Purchases -> `+`, TWICE:

   **a. The app itself**
   - Type: **Non-Consumable**
   - Reference name: `eGeez full app`
   - Product ID: `full_app`
   - Price: $12.99 tier
   - Localization (English): Display name `Unlock eGeez`, description
     `Unlock every letter, game and story. One payment, forever.`

   **b. The add-on** (optional; skip if you are not selling it yet)
   - Type: **Non-Consumable**
   - Reference name: `Family Pack`
   - Product ID: `family_pack`
   - Price: $4.99 tier
   - Localization (English): Display name `Family Pack`, description
     `Profiles for every child in the family on this device.`

   Each needs a **review screenshot** (a shot of the sheet that sells it:
   the after-trial dialog for `full_app`, the Grown-Ups Children card for
   `family_pack`). Submit the IAPs **together with the app version** -
   a first IAP submitted on its own is rejected.
4. Xcode: open the App target -> Signing & Capabilities -> `+ Capability`
   -> **In-App Purchase**. NOT YET DONE in this repo - the project has no
   entitlements file, so this is a required step before the first paid
   build. Commit the resulting `App.entitlements` + project change.
5. Create a **Sandbox tester** (Users and Access -> Sandbox) for testing.
6. Metadata (Apple 2.3.2): state in the description that the app needs a
   one-time purchase after the free trial. The "What's New" line covers
   this too.

## 2. Google Play Console

1. Monetization setup must be complete (payments profile).
2. eGeez -> Monetize -> Products -> In-app products -> Create.
   - `full_app` - `Unlock eGeez`, $12.99
   - `family_pack` - `Family Pack`, $4.99
   Auto-converts per country; round if you like. **Activate** both.
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
3. Product catalog -> Products: add `full_app` AND `family_pack` for
   BOTH stores.
4. Entitlements: create `full_app` and `family_pack` and attach the
   matching products to each. (The app checks these exact ids -
   `FULL_APP_ENTITLEMENT` / `FAMILY_PACK_ENTITLEMENT` in
   `src/platform/iap.js`.)
5. Offerings: the default (current) offering with **two packages**, one
   per product, for each store. The app selects between them by product
   id, so both must live in the SAME current offering - a product that is
   not in it cannot be bought.
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

- iOS, the app purchase: run from Xcode on a device signed into the
  Sandbox tester. Let the 3-day trial lapse (or set the device date
  forward, or edit `fq.license.v1.startDay` in Safari Web Inspector) so
  the after-trial dialog appears -> pass the parental gate -> Buy the app
  -> the Apple sheet should show $12.99 and complete. Delete + reinstall
  -> the app unlocks itself on launch (initIap), or via Restore.
- iOS, the add-on: Grown-Ups -> Children -> Get the Family Pack -> $4.99.
- Android: internal/closed-track build with a license-tester account ->
  the same two flows through the Google sheet.
- Also verify the DAILY WINDOW still works while unpaid: the after-trial
  dialog's "Open everything for 5 minutes" must not go through the store
  at all.

## Notes

- Refunds: handled by the stores; RevenueCat revokes the entitlement,
  but the app only re-checks on launch/restore - acceptable at this
  price, and the honest-app posture assumes good faith anyway.
- Never pay twice: a store purchase and a website EGZ code both set the
  same `supported` flag, so a family that bought on the web redeems the
  code in the store build instead of paying again.
- The web flow and FAM redeem codes stay live regardless; they carry no
  store commission and serve community grants.
- Small Business Program (Apple) / 15% service fee tier (Google): enroll
  in both so the cut is 15%, not 30%.
