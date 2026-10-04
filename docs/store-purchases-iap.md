# Store purchases (in-app): owner setup runbook (1.3.1+)

eGeez is **paid upfront**: $12.99 at download on the App Store and Google
Play. That price includes every learning path, every Bible book and **one**
kid profile. The **only** in-app purchases are extra kids profiles, one per
child, bought in order, up to 6 children:

| Child | Product ID (identical on both stores) | Type | Price (USD tier) | Reference / display name |
| --- | --- | --- | --- | --- |
| 1st | (included in the $12.99 app) | - | - | - |
| 2nd | `profile_slot_2` | Non-consumable / one-time product | **$4.99** | Kid profile 2 |
| 3rd | `profile_slot_3` | Non-consumable / one-time product | **$2.49** | Kid profile 3 |
| 4th | `profile_slot_4` | Non-consumable / one-time product | **$2.49** | Kid profile 4 |
| 5th | `profile_slot_5` | Non-consumable / one-time product | **$2.49** | Kid profile 5 |
| 6th | `profile_slot_6` | Non-consumable / one-time product | **$2.49** | Kid profile 6 |

- The app only ever offers the **next** slot (`buyNextProfileSlot()` in
  `src/platform/iap.js` takes no argument), so slots are always bought in
  order; a slot only counts once every slot before it is owned.
- `family_pack` (the 1.2 "unlock 6 kids" product) is **recognised but never
  sold**: a family whose store account owns it gets all 6 profiles on Restore
  / launch sync. Leave it **Removed from sale** in App Store Connect and
  **Inactive** in Play Console (deleting it would break restore for those
  families on Play, and App Store product ids can never be reused anyway).
  1.2 FAM-code / web unlocks already on a device (`fq.familypack.v1`) also
  keep all 6.
- `full_app` stays retired. Xcode Cloud's `ci_post_clone.sh` fails the build
  if `full_app` appears in the bundle or `profile_slot_` is missing.
- The prices in the app UI come from the store (localized); the website
  (`website/src/config.js`: `APP_PRICE`, `SECOND_PROFILE_PRICE`,
  `EXTRA_PROFILE_PRICE`) must match the US tiers above.

Plugin: `@capgo/native-purchases` 7.19.x (Capacitor 7 line). StoreKit 2 on
iOS, Play Billing on Android, **no RevenueCat, no server, no API keys**.
Native config already in the repo: `com.android.vending.BILLING` in
`AndroidManifest.xml`, `CapgoNativePurchases` in `ios/App/Podfile`,
`capgo-native-purchases` in the Android Gradle settings.

## 1. App Store Connect

1. Agreements, Tax, and Banking: the **Paid Apps** agreement must be active.
2. My Apps -> eGeez -> Monetization -> In-App Purchases -> **+** five times,
   type **Non-Consumable**:
   - Reference name `Kid profile 2`, Product ID `profile_slot_2`, price
     **$4.99**. Localization (English): display name `2nd kid profile`,
     description `Add a second child with their own path, stars and rewards.`
   - `profile_slot_3`..`profile_slot_6`, price **$2.49** each, display names
     `3rd kid profile` .. `6th kid profile`, description `Add one more child
     with their own path, stars and rewards.`
   - Each needs a **review screenshot** (use
     `/workspace/egeez-shots/family-pack/` `grownups-restore` / the
     unlock screen) and review notes: "Grown-Ups (parental gate: hold the
     button, answer the sum) -> Children -> Unlock profile N. Restore
     purchases is next to it."
   - Availability: all territories where the app is sold.
3. Old products: `family_pack` -> **Remove from Sale** (keep it; owners
   restore through it). `full_app` -> Remove from Sale if it still exists.
4. App version **1.3.1 (8)** -> "In-App Purchases and Subscriptions"
   section -> **add all five `profile_slot_*` products** to this
   submission. First-time IAPs are only reviewed together with an app
   version; submitting them alone is rejected.
5. App Privacy: unchanged (Data Not Collected). Purchases are handled by
   Apple.
6. Kids Category: purchases are behind the parental gate (Guideline 1.3);
   say so in the review notes.
7. Sandbox test: Users and Access -> Sandbox -> add a tester. On a device
   build: Grown-Ups -> Children -> Unlock profile 2 ($4.99) -> buy -> add a
   child -> Unlock profile 3 ($2.49). Delete + reinstall -> Restore
   purchases -> "Kids profiles unlocked: 3 of 6".

## 2. Google Play Console

1. Payments profile linked (it already is for the paid app).
2. eGeez -> Monetize with Play -> Products -> **One-time products** ->
   Create five products, each with one purchase option (Buy, not
   rentable), **Active**:
   - `profile_slot_2` - `2nd kid profile` - $4.99
   - `profile_slot_3` .. `profile_slot_6` - `3rd kid profile` .. `6th kid
     profile` - $2.49 each
   Use "Set prices" -> convert from USD for other countries.
3. Old product `family_pack`: set **Inactive** (do not delete). `full_app`:
   Inactive if present.
4. Upload **1.3.1 (versionCode 8)** to internal testing first; one-time
   products can only be bought from a build installed through Play.
   Settings -> License testing -> add tester accounts.
5. Families policy: the purchase is behind the parental gate; Play Billing
   is the only payment method. Data safety form: unchanged ("purchase
   history" is handled by Google Play, not collected by the app).

## 3. Test checklist (both stores)

- Fresh install: 1 profile, "+" shows a lock. Child tapping it sees "ask a
  grown-up" with **no price and no Buy button**.
- "I'm a grown-up" -> hold + sum gate -> "Add child 2" -> **Unlock profile 2
  ($4.99)** -> store sheet -> success goes straight to the new-player form.
- With 2 children: the next offer is **Unlock profile 3 ($2.49)**.
- Grown-Ups -> Children shows the same offer when locked, and "Kids profiles
  unlocked: N of 6" + **Restore purchases** otherwise.
- Reinstall / second device on the same store account: Restore purchases
  brings every slot back; on Android the launch sync also does it silently.
- Ask to Buy (iOS Family Sharing) / slow Play payment: "Waiting for a
  grown-up to approve"; the slot unlocks when approved (listener / next
  launch).
- Refund a slot in sandbox: on the next launch the limit drops; children
  already created are never deleted, only adding is blocked.
- A tester account that owns the old `family_pack`: Restore -> all 6.

## Notes

- Small Business Program (Apple) / 15% service-fee tier (Google): enroll
  in both so the store cut is 15%, not 30%.
- Nothing is sold on the website or by the API (no Stripe, no codes). The
  `/pricing` page only explains the prices and links to the stores.
