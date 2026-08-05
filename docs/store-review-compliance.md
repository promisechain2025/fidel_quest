# Store review readiness — eGeez (Apple + Google Play)

A guideline-by-guideline check for submitting **eGeez** (a children's, offline,
no-ads, no-data Fidel learning app; Capacitor iOS + Android; free trial → paid
**Family Pack** IAP). Cross-references the current **Apple App Store Review
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

> **v1 model = a straight PAID app.** Leave `VITE_MONETIZE` unset (default) and
> set a **price** in both consoles. The store takes payment at download; the
> installed app unlocks fully, with **no in-app trial, no "Not now" bypass, and
> no purchase/IAP/RevenueCat UI**. So the IAP rows (2.1(b), 3.1.1 trial) are
> **N/A** and **"Data Not Collected" is accurate**.
>
> **Changed for 1.2 (August 2026):** `VITE_MONETIZE=true` is now set, so the
> shipped model is **free download → 3-day trial → buy once ($12.99)**. Native
> builds still cannot charge until a RevenueCat key is present (`iapAvailable()`
> is false → `licenseState()` returns `licensed` and no purchase UI renders), so
> the IAP rows stay N/A for a keyless build and become live the moment a key and
> a `full_app` product exist.
>
> **The daily window.** Once the trial ends, one tap opens the whole app for
> `DAILY_PASS_MINUTES` (5) per calendar day, forever. It is deliberately the one
> control **outside** the parental gate in SupportAsk: it is not a purchase, it
> links nowhere, and it takes no data — so 1.3 / 5.1.4 do not apply to it, while
> Buy / Gift / Feedback stay gated. It also means a child who taps a locked
> feature is never left at a dead end.

- ✅ **Fixed (Apple 1.3 / 5.1.4 / 3.1.1):** the after-trial **SupportAsk**
  dialog now shows the child only "this is for a grown-up" + the hold-and-answer
  **parental gate**; the **Buy / Gift / Feedback** actions appear only after the
  gate, and on native the purchase runs through the **in-app purchase**
  (`buyFamilyPack`), not an external link. (`components/SupportAsk.jsx`)
- ✅ **Fixed (Apple 5.1.1(i)):** an **in-app privacy-policy link** + a
  "collects no data" line now sit in the gated Grown-Ups area (`privacyUrl()` →
  `VITE_PRIVACY_URL`, falling back to the app URL).

---

## Apple — App Store Review Guidelines

| # | Requirement | eGeez status |
| --- | --- | --- |
| **1.3** Kids Category | No links out, purchase opportunities, or distractions to kids **unless behind a parental gate**. | 🟢 **Fixed.** Grown-Ups and the after-trial SupportAsk now put Buy/Gift/Feedback/links behind the parental gate. |
| **2.1(a)** Completeness | Final build, no placeholder, tested on device. | 🟢 Real build. Scrub any placeholder listing text. |
| **2.1(b)** IAP works for reviewer | Family Pack must be visible + functional in review. | 🟠 Set `VITE_REVENUECAT_APPLE_KEY` and create the IAP in App Store Connect so the reviewer can buy it; add gate-passing steps to Review Notes (already drafted in `store-listing.md`). |
| **2.3.1** No hidden/dormant/undocumented features | Everything must be documented + reachable. | 🟠 Several env-gated integrations (analytics, social, shop, error-report, RevenueCat) ship **inert** with env unset — fine, but keep them unset (§ build flags) and **declare** the RevenueCat purchase flow in Review Notes so it isn't "undocumented". |
| **2.3.2** Disclose IAP in metadata | Description/screenshots must indicate paid items. | 🟠 State in the description that continued use needs the **Family Pack** purchase after the free trial. |
| **2.3.6** Honest age rating | Answer age questions truthfully. | 🟢 Education, age band 6–8 (also 5&under). Answer IARC honestly (no violence/ads/data). |
| **2.3.8** Metadata 4+ | Icons/screenshots 4+. | 🟢 Anbessa art is 4+. |
| **3.1.1** In-App Purchase | Unlocking features must use **IAP**, not license keys or external purchase. | 🟢 **Fixed in-app:** SupportAsk "Buy" now calls the **Family Pack IAP** (`buyFamilyPack`) on native; the external link is a web-only fallback. Still keep **`VITE_BUY_URL` unset** for the store build. |
| **3.1.1** Free-trial rule | A non-subscription trial should be a Price-Tier-0 **"XX-day Trial"** non-consumable, with the duration + what's lost + downstream cost disclosed up front. | 🟠 `platform/license.js` implements a day-based trial in JS. Represent/disclose it per this rule and state the trial length + that the Family Pack is needed after. |
| **4.1(a,b,c)** Copycats | Original ideas, no impersonation, no others' brands. | 🟢 Original characters (Anbessa/Kokeb/Jibby), original name, all art drawn in code. |
| **4.2** Minimum functionality | More than a repackaged website. | 🟢 Rich offline game (games, tracing, TTS-optional audio, dashboards) — clearly app-like. |
| **4.3(a,b)** Spam | Single, distinct app. | 🟢 One app, one bundle id. |
| **5.1.1(i)** Privacy policy | Linked in **App Store Connect** *and* **in-app**, stating what's collected. | 🟢 **Fixed:** in-app link now in gated Grown-Ups (`privacyUrl()`). Set **`VITE_PRIVACY_URL`** to the hosted page + paste it in App Store Connect. Policy states "no data collected". |
| **5.1.1(ii/iii)** Consent / minimization | Consent for any collection; request only needed data. | 🟢 No collection in the store build; mic requested only for the adult Family-Voice recorder. |
| **5.1.4(a)** Kids: no 3rd-party analytics/ads | Kids apps shouldn't include third-party analytics or ads. | 🟢 No ads anywhere; analytics/social/error-report are first-party and **off** with env unset. Confirm RevenueCat is declared as purchase-only, not analytics. |
| **5.1.4(b)** Kids privacy policy | Privacy policy + children's-privacy compliance. | 🟢 Covered by the no-data policy; keep it accurate if any env is later enabled. |
| **5.1.5** Location | Only if relevant. | 🟢 No location use. |
| **5.1.1** Permission strings | Purpose strings for each permission. | 🟠 If the mic recorder ships, add `NSMicrophoneUsageDescription` (adult-facing); local-notification permission prompt is fine. Or build with `VITE_FAMILY_VOICE_RECORD=false` (no mic). |

---

## Google Play — Families policy

| Policy area | Requirement | eGeez status |
| --- | --- | --- |
| Target audience & content ("Designed for Families") | Declare child age bands; content appropriate; opt into the Families program. | 🟠 Set target audience to **5&under + 6–8**; category Education. |
| Ads & monetization (Families Ads and Monetization) | Child-directed apps must use only **Families self-certified ad SDKs**; no personalized ads; IAP via **Play Billing** and non-manipulative. | 🟢 **No ads** → SDK requirement N/A. IAP uses Play Billing (RevenueCat). Keep the purchase prompt non-manipulative and (as with Apple) behind the gate. |
| Data safety form | Declare exactly what's collected/shared. | 🟠 Declare **no data collected / no data shared** — true only for the env-unset build; keep it accurate. |
| Content rating (IARC) | Complete the questionnaire honestly. | 🟠 Complete it; expect an "Everyone" rating. |
| Permissions & data minimization | Request only necessary permissions. | 🟢 Mic (optional, declare or drop), local notifications; no location/contacts. |
| Anonymous chat (July 2026 update) | Child-directed apps may not offer anonymous chat. | 🟢 No chat. |
| APIs/SDKs | Only families-appropriate SDKs. | 🟢 Capacitor + RevenueCat (purchases); no ad/analytics SDKs in the store build. |

---

## Must-do before you submit

1. ✅ **Done — parental-gated the after-trial dialog** (`SupportAsk.jsx`): the
   Buy / Gift / Feedback actions are behind the gate; Buy uses the IAP on
   native. *(Apple 1.3, 5.1.4, 3.1.1)*
2. ✅ **Done — in-app privacy-policy link** added in gated Grown-Ups.
   *(Apple 5.1.1(i))* — remember to **set `VITE_PRIVACY_URL`** at build.
3. 🟠 **Disclose the trial in the listing** — the description/screenshots must
   say continued use needs the **Family Pack** after the free trial, and (per
   3.1.1's trial rule) state the trial length + what's lost. *(2.3.2, 3.1.1 —
   metadata, not code)*

## Platform minimums

| Platform | Setting | Value | Why |
| --- | --- | --- | --- |
| iOS | `IPHONEOS_DEPLOYMENT_TARGET` + `Podfile` platform | **15.0** | ITMS-90068 on build 115 (1.2.0): from Spring 2027 App Store Connect refuses uploads below 15.0. Raised early because it costs nothing - see below. |
| Android | `minSdkVersion` | 23 (Android 6) | Capacitor 7's floor. |
| Android | `targetSdkVersion` | 36 | Ahead of Play's current requirement. |

**Raising iOS 14 -> 15 drops no devices.** iOS 15 runs on exactly the same
hardware iOS 14 did (iPhone 6s / SE 1st gen and later), so the only people
affected are those who chose never to update. Both are far below Capacitor
7's own floor (iOS 14) and RevenueCat's (iOS 13), so no pod is at risk.

**After pulling this change, run `pod install` in `ios/App`** - the
`assertDeploymentTarget` hook in the Podfile only rewrites each pod target's
deployment target during install, so the Pods project keeps the old value
until you do.

## Build-flag & metadata checklist (store build)

- [ ] **Unset** `VITE_ANALYTICS_URL`, `VITE_SOCIAL_URL`, `VITE_SHOP_URL`,
      `VITE_BUY_URL`, `VITE_ERROR_REPORT_URL` (provably no data / no external
      purchase link).
- [ ] **Set** `VITE_REVENUECAT_APPLE_KEY` / `VITE_REVENUECAT_GOOGLE_KEY` and
      create the Family Pack IAP in both consoles so the reviewer can test it.
- [ ] Mic: build with `VITE_FAMILY_VOICE_RECORD=false`, **or** ship the
      recorder and add the iOS `NSMicrophoneUsageDescription` + Android
      `RECORD_AUDIO` declaration.
- [ ] Version bumped (currently **1.2.0**, iOS build **5** / Android
      versionCode **5**).
- [ ] Apple **App Privacy** = *Data Not Collected*; Google **Data safety** =
      *no data collected/shared*.
- [ ] Host the **privacy policy** (template in `APP-STORE.md §8`); set
      **`VITE_PRIVACY_URL`** so the in-app link points at it, and paste the URL
      into both stores.
- [ ] **Review Notes**: how to pass the parental gate (hold 2s, tap the spoken
      number), how to reach/test the Family Pack IAP, and that dormant server
      features are disabled in this build. (Draft in `docs/store-listing.md`.)
- [ ] Content rating (IARC) + age bands answered honestly on both stores.

## Sources

- Apple — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.3, 2.1, 2.3, 3.1.1, 4.1, 4.2, 4.3, 5.1.1, 5.1.4).
- Google Play — [Families program](https://play.google.com/console/about/programs/families/), [Families policy requirements](https://support.google.com/googleplay/android-developer/answer/9893335), [Families self-certified Ads SDK](https://support.google.com/googleplay/android-developer/answer/9900633), [Data practices in Families apps](https://support.google.com/googleplay/android-developer/answer/11043825), [Target audience & content](https://support.google.com/googleplay/android-developer/answer/9867159).
