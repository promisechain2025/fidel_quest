# Store review readiness — eGeez (Apple + Google Play)

A guideline-by-guideline check for submitting **eGeez** (a children's, offline,
no-ads, no-data Fidel learning app; Capacitor iOS + Android; **paid upfront
$12.99, everything included, no in-app purchases** since 1.3.0). Cross-references the current **Apple App Store Review
Guidelines** and **Google Play Families** policy against what's actually in the
code. Pair this with the submission runbook in `APP-STORE.md` and the listing
copy in `docs/store-listing.md`.

**Verdict: most in-code guideline fixes are DONE; a July-2026 agent review
surfaced two items that still need a decision (below) plus submission-time
metadata / build-flags / console forms.**

## Open items from the review (decide before submitting)

1. ✅ **Fixed — share sheet now parental-gated (Apple 1.3 / Google Families).**
   Every child-reachable "Share Anbessa" surface (`Closet.jsx`, the Daily-Gift
   reveal, the chapter-complete Celebration, `ChallengeShareButton`) now routes
   through `useShareGate` (`components/ShareGate.jsx`), which shows the same
   hold-and-answer `ParentalGate` before opening the OS share sheet. The
   student→teacher assignment receipt (`AssignmentDone`) is left ungated on
   purpose: it is a directed submission inside the adult-initiated Teacher
   flow, not a child-facing social share.
2. 🟠 **Default pack vs. stories.** `detectPreferredPack()` returns Tigrinya on
   non-Amharic locales, but the 10 stories are Amharic-only, so Story Time is
   empty on those devices until Tigrinya stories ship. **Decision (owner):**
   waiting for the Tigrinya story translations rather than flipping the default.
   Make sure the reviewer/test device locale is Amharic so the feature is
   exercised.
3. **Religious content is undisclosed (Apple 2.3.1 / IARC).** All 10 Story
   Time stories are gentle Bible stories. The IARC questionnaire asks about
   religious references, and the listing markets only "games, stories and
   rewards". **Decision needed:** add a line to the description ("gentle Bible
   stories") and answer the IARC religion question truthfully. No code change.

> **1.3.0 model (October 2026): PAID UPFRONT, $12.99, everything included.**
> The store takes payment at download; every build is fully unlocked
> (`platform/license.js` `fullAccess()` is always true). There is **no trial,
> no daily window, no unlock code, no Family Pack, no in-app purchase, no
> subscription, and no Buy / Restore / Gift UI** anywhere in the app. The
> old trial engine, SupportAsk dialog, gift flow and EGZ/FAM code system were
> deleted, the Android BILLING permission was removed, and there is no
> StoreKit configuration. `platform/iap.js` remains only as a dormant,
> fail-closed guard (needs `VITE_STORE_IAP=true` plus a RevenueCat key, and no
> plugin is bundled); `ios/App/ci_scripts/ci_post_clone.sh` fails Xcode Cloud
> if `VITE_STORE_IAP` is set. So every IAP row below (2.1(b), 2.3.2, 3.1.1) is
> **N/A**, and **"Data Not Collected" is accurate**.
> `src/platform/paidUpfront.test.js` guards all of this.

- ✅ **Fixed (Apple 5.1.1(i)):** an **in-app privacy-policy link** + a
  "collects no data" line now sit in the gated Grown-Ups area (`privacyUrl()` →
  `VITE_PRIVACY_URL`, falling back to the app URL).

---

## Apple — App Store Review Guidelines

| # | Requirement | eGeez status |
| --- | --- | --- |
| **1.3** Kids Category | No links out, purchase opportunities, or distractions to kids **unless behind a parental gate**. | 🟢 There are no purchase opportunities in the app at all (paid upfront). Grown-Ups, settings and every outside link sit behind the parental gate. |
| **2.1(a)** Completeness | Final build, no placeholder, tested on device. | 🟢 Real build. Scrub any placeholder listing text. |
| **2.1(b)** IAP works for reviewer | IAPs must be visible + functional in review. | ⚪ **N/A** - no in-app purchases. Create no IAP products in App Store Connect. Gate-passing steps are in Review Notes (`store-listing.md`). |
| **2.3.1** No hidden/dormant/undocumented features | Everything must be documented + reachable. | 🟠 Several env-gated integrations (analytics, social, shop, error-report) ship **inert** with env unset — fine, but keep them unset (§ build flags). The dormant `iap.js` guard has no UI and no plugin; keep `VITE_STORE_IAP` unset. |
| **2.3.2** Disclose IAP in metadata | Description/screenshots must indicate paid items. | ⚪ **N/A** - no paid items inside the app. The listing says "no in-app purchases, no subscriptions". |
| **2.3.6** Honest age rating | Answer age questions truthfully. | 🟢 Education, age band 6–8 (also 5&under). Answer IARC honestly (no violence/ads/data). |
| **2.3.8** Metadata 4+ | Icons/screenshots 4+. | 🟢 Anbessa art is 4+. |
| **3.1.1** In-App Purchase | Unlocking features must use **IAP**, not license keys or external purchase. | ⚪ **N/A** - nothing is unlocked after download; no license keys, no codes, no external purchase links. |
| **3.1.1** Free-trial rule | A non-subscription trial should be a Price-Tier-0 **"XX-day Trial"** non-consumable, with the duration + what's lost + downstream cost disclosed up front. | ⚪ **N/A** - no trial (removed in 1.3.0). |
| **4.1(a,b,c)** Copycats | Original ideas, no impersonation, no others' brands. | 🟢 Original characters (Anbessa/Kokeb/Jibby), original name, all art drawn in code. |
| **4.2** Minimum functionality | More than a repackaged website. | 🟢 Rich offline game (games, tracing, TTS-optional audio, dashboards) — clearly app-like. |
| **4.3(a,b)** Spam | Single, distinct app. | 🟢 One app, one bundle id. |
| **5.1.1(i)** Privacy policy | Linked in **App Store Connect** *and* **in-app**, stating what's collected. | 🟢 **Fixed:** in-app link now in gated Grown-Ups (`privacyUrl()`). Set **`VITE_PRIVACY_URL`** to the hosted page + paste it in App Store Connect. Policy states "no data collected". |
| **5.1.1(ii/iii)** Consent / minimization | Consent for any collection; request only needed data. | 🟢 No collection in the store build; mic requested only for the adult Family-Voice recorder. |
| **5.1.4(a)** Kids: no 3rd-party analytics/ads | Kids apps shouldn't include third-party analytics or ads. | 🟢 No ads anywhere; analytics/social/error-report are first-party and **off** with env unset. No purchase SDK is bundled. |
| **5.1.4(b)** Kids privacy policy | Privacy policy + children's-privacy compliance. | 🟢 Covered by the no-data policy; keep it accurate if any env is later enabled. |
| **5.1.5** Location | Only if relevant. | 🟢 No location use. |
| **5.1.1** Permission strings | Purpose strings for each permission. | 🟠 If the mic recorder ships, add `NSMicrophoneUsageDescription` (adult-facing); local-notification permission prompt is fine. Or build with `VITE_FAMILY_VOICE_RECORD=false` (no mic). |

---

## Google Play — Families policy

| Policy area | Requirement | eGeez status |
| --- | --- | --- |
| Target audience & content ("Designed for Families") | Declare child age bands; content appropriate; opt into the Families program. | 🟠 Set target audience to **5&under + 6–8**; category Education. |
| Ads & monetization (Families Ads and Monetization) | Child-directed apps must use only **Families self-certified ad SDKs**; no personalized ads; IAP via **Play Billing** and non-manipulative. | 🟢 **No ads** → SDK requirement N/A. No in-app products and no BILLING permission; the app is a paid download. |
| Data safety form | Declare exactly what's collected/shared. | 🟠 Declare **no data collected / no data shared** — true only for the env-unset build; keep it accurate. |
| Content rating (IARC) | Complete the questionnaire honestly. | 🟠 Complete it; expect an "Everyone" rating. |
| Permissions & data minimization | Request only necessary permissions. | 🟢 Mic (optional, declare or drop), local notifications; no location/contacts. |
| Anonymous chat (July 2026 update) | Child-directed apps may not offer anonymous chat. | 🟢 No chat. |
| APIs/SDKs | Only families-appropriate SDKs. | 🟢 Capacitor only; no purchase, ad or analytics SDKs in the store build. |

---

## Must-do before you submit

1. ✅ **Done — removed every in-app purchase surface** (1.3.0 paid upfront):
   no trial dialog, no Buy / Restore / Gift / Family Pack UI. *(Apple 1.3,
   5.1.4, 3.1.1)*
2. ✅ **Done — in-app privacy-policy link** added in gated Grown-Ups.
   *(Apple 5.1.1(i))* — remember to **set `VITE_PRIVACY_URL`** at build.
3. 🟠 **Set the price to $12.99** in App Store Connect and Play Console, and
   make sure **no IAP products** exist in either console (remove or leave
   unsubmitted any old `full_app` / `family_pack` products). *(metadata, not code)*

## Platform minimums

| Platform | Setting | Value | Why |
| --- | --- | --- | --- |
| iOS | `IPHONEOS_DEPLOYMENT_TARGET` + `Podfile` platform | **15.0** | ITMS-90068 on build 115 (1.2.0): from Spring 2027 App Store Connect refuses uploads below 15.0. Raised early because it costs nothing - see below. |
| Android | `minSdkVersion` | 23 (Android 6) | Capacitor 7's floor. |
| Android | `targetSdkVersion` | 36 | Ahead of Play's current requirement. |

**Raising iOS 14 -> 15 drops no devices.** iOS 15 runs on exactly the same
hardware iOS 14 did (iPhone 6s / SE 1st gen and later), so the only people
affected are those who chose never to update. Both are far below Capacitor
7's own floor (iOS 14), so no pod is at risk.

**After pulling this change, run `pod install` in `ios/App`** - the
`assertDeploymentTarget` hook in the Podfile only rewrites each pod target's
deployment target during install, so the Pods project keeps the old value
until you do.

## Build-flag & metadata checklist (store build)

- [ ] **Unset** `VITE_ANALYTICS_URL`, `VITE_SOCIAL_URL`, `VITE_SHOP_URL`,
      `VITE_BUY_URL`, `VITE_ERROR_REPORT_URL` (provably no data / no external
      purchase link).
- [ ] **Paid upfront (v1.3.0):** do **not** set `VITE_STORE_IAP` (Xcode Cloud
      fails in `ci_post_clone.sh` if it is). Remove any leftover RevenueCat keys
      from the Xcode Cloud env; they are ignored, but nothing needs them.
      Set the **$12.99** price in App Store Connect (Pricing and Availability).
- [ ] Mic: build with `VITE_FAMILY_VOICE_RECORD=false`, **or** ship the
      recorder and add the iOS `NSMicrophoneUsageDescription` + Android
      `RECORD_AUDIO` declaration.
- [ ] Version bumped (currently **1.3.0**, iOS build **7** (Xcode Cloud assigns its own) / Android
      versionCode **7**).
- [ ] Apple **App Privacy** = *Data Not Collected*; Google **Data safety** =
      *no data collected/shared*.
- [ ] Host the **privacy policy** (template in `APP-STORE.md §8`); set
      **`VITE_PRIVACY_URL`** so the in-app link points at it, and paste the URL
      into both stores.
- [ ] **Review Notes**: how to pass the parental gate (hold 2s, tap the spoken
      number), that the app has no in-app purchases (paid upfront, everything unlocked), and that dormant server
      features are disabled in this build. (Draft in `docs/store-listing.md`.)
- [ ] Content rating (IARC) + age bands answered honestly on both stores.

## Sources

- Apple — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.3, 2.1, 2.3, 3.1.1, 4.1, 4.2, 4.3, 5.1.1, 5.1.4).
- Google Play — [Families program](https://play.google.com/console/about/programs/families/), [Families policy requirements](https://support.google.com/googleplay/android-developer/answer/9893335), [Families self-certified Ads SDK](https://support.google.com/googleplay/android-developer/answer/9900633), [Data practices in Families apps](https://support.google.com/googleplay/android-developer/answer/11043825), [Target audience & content](https://support.google.com/googleplay/android-developer/answer/9867159).
