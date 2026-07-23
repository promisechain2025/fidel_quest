# Store review readiness — eGeez (Apple + Google Play)

A guideline-by-guideline check for submitting **eGeez** (a children's, offline,
no-ads, no-data Fidel learning app; Capacitor iOS + Android; free trial → paid
**Family Pack** IAP). Cross-references the current **Apple App Store Review
Guidelines** and **Google Play Families** policy against what's actually in the
code. Pair this with the submission runbook in `APP-STORE.md` and the listing
copy in `docs/store-listing.md`.

**Verdict: nearly ready. One must-fix, one should-fix, plus the build-flag /
metadata checklist below.**

- 🔴 **Must-fix (Apple 1.3 / 5.1.4 / 3.1.1):** the after-trial **SupportAsk**
  dialog is shown to the child and exposes external actions **not behind a
  parental gate** — a "Buy the app" link (`buyUrl()` falls back to the App
  Store URL even with `VITE_BUY_URL` unset) and a **feedback `mailto:`**. Kids
  apps may not present links out of the app or purchase opportunities to a
  child unless behind a parental gate.
- 🟠 **Should-fix (Apple 5.1.1(i)):** add an **in-app privacy-policy link**
  (e.g. in Grown-Ups). Today the policy is only in store metadata; Apple wants
  it reachable inside the app too. (Per-feature privacy microcopy exists, but
  not a link to the full policy.)

---

## Apple — App Store Review Guidelines

| # | Requirement | eGeez status |
| --- | --- | --- |
| **1.3** Kids Category | No links out, purchase opportunities, or distractions to kids **unless behind a parental gate**. | 🔴 Grown-Ups purchase/links **are** gated; but **SupportAsk** (after-trial) shows a Buy link + feedback mailto to the child **un-gated**. Gate them or move to the gated area. |
| **2.1(a)** Completeness | Final build, no placeholder, tested on device. | 🟢 Real build. Scrub any placeholder listing text. |
| **2.1(b)** IAP works for reviewer | Family Pack must be visible + functional in review. | 🟠 Set `VITE_REVENUECAT_APPLE_KEY` and create the IAP in App Store Connect so the reviewer can buy it; add gate-passing steps to Review Notes (already drafted in `store-listing.md`). |
| **2.3.1** No hidden/dormant/undocumented features | Everything must be documented + reachable. | 🟠 Several env-gated integrations (analytics, social, shop, error-report, RevenueCat) ship **inert** with env unset — fine, but keep them unset (§ build flags) and **declare** the RevenueCat purchase flow in Review Notes so it isn't "undocumented". |
| **2.3.2** Disclose IAP in metadata | Description/screenshots must indicate paid items. | 🟠 State in the description that continued use needs the **Family Pack** purchase after the free trial. |
| **2.3.6** Honest age rating | Answer age questions truthfully. | 🟢 Education, age band 6–8 (also 5&under). Answer IARC honestly (no violence/ads/data). |
| **2.3.8** Metadata 4+ | Icons/screenshots 4+. | 🟢 Anbessa art is 4+. |
| **3.1.1** In-App Purchase | Unlocking features must use **IAP**, not license keys or external purchase. | 🔴/🟠 The unlock must be the **Family Pack IAP** (RevenueCat → StoreKit ✅). Ensure **`VITE_BUY_URL` unset** and that the SupportAsk "Buy the app" App-Store link is **not** the unlock path. |
| **3.1.1** Free-trial rule | A non-subscription trial should be a Price-Tier-0 **"XX-day Trial"** non-consumable, with the duration + what's lost + downstream cost disclosed up front. | 🟠 `platform/license.js` implements a day-based trial in JS. Represent/disclose it per this rule and state the trial length + that the Family Pack is needed after. |
| **4.1(a,b,c)** Copycats | Original ideas, no impersonation, no others' brands. | 🟢 Original characters (Anbessa/Kokeb/Jibby), original name, all art drawn in code. |
| **4.2** Minimum functionality | More than a repackaged website. | 🟢 Rich offline game (games, tracing, TTS-optional audio, dashboards) — clearly app-like. |
| **4.3(a,b)** Spam | Single, distinct app. | 🟢 One app, one bundle id. |
| **5.1.1(i)** Privacy policy | Linked in **App Store Connect** *and* **in-app**, stating what's collected. | 🟠 Store-metadata policy is planned (`APP-STORE.md §8`); **add an in-app link** to it. Policy states "no data collected". |
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

1. 🔴 **Parental-gate the after-trial dialog.** In `components/SupportAsk.jsx`,
   put the **Buy** link and the **feedback mailto** behind the existing
   `ParentalGate` (or drop them from the child-facing dialog and route the
   unlock to the already-gated Grown-Ups → Family Pack IAP). *(Apple 1.3,
   5.1.4, 3.1.1)*
2. 🟠 **Add an in-app privacy-policy link** (Grown-Ups is a good home).
   *(Apple 5.1.1(i))*
3. 🟠 **Represent the trial + unlock as IAP** and disclose the trial length +
   that the Family Pack is required afterward. *(Apple 3.1.1, 2.3.2)*

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
- [ ] Host the **privacy policy** (template in `APP-STORE.md §8`); link it in
      both stores **and in-app**.
- [ ] **Review Notes**: how to pass the parental gate (hold 2s, tap the spoken
      number), how to reach/test the Family Pack IAP, and that dormant server
      features are disabled in this build. (Draft in `docs/store-listing.md`.)
- [ ] Content rating (IARC) + age bands answered honestly on both stores.

## Sources

- Apple — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (1.3, 2.1, 2.3, 3.1.1, 4.1, 4.2, 4.3, 5.1.1, 5.1.4).
- Google Play — [Families program](https://play.google.com/console/about/programs/families/), [Families policy requirements](https://support.google.com/googleplay/android-developer/answer/9893335), [Families self-certified Ads SDK](https://support.google.com/googleplay/android-developer/answer/9900633), [Data practices in Families apps](https://support.google.com/googleplay/android-developer/answer/11043825), [Target audience & content](https://support.google.com/googleplay/android-developer/answer/9867159).
