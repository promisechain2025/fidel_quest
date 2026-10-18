# 1.3.3 paid-buyer mark (prep for free + IAP)

Plan: /workspace/egeez-free-iap-plan.md (approved 2026-10-18). 1.3.3 is still paid.

- `src/platform/paidBuyer.js`: on every native launch, `ensurePaidBuyerMark()` writes `fq.paidBuyer.v1` (a device key, not per child) with a signed re-entry code `EGL-<ID6>-<P><DD><SSSS>` (HMAC-SHA256, P = A/I/S). It is idempotent. A tampered mark is dropped.
- Backup: `fullSnapshot()` carries the mark and `restoreFull()` accepts it (re-verified on launch). A new mark clears `fq.backup.day`, so today's backup file includes it.
- Re-entry: Grown-Ups → "Purchase code" (native only, behind the parental gate) shows the code and accepts one after a reinstall. No prices and no links.
- iOS: `AppTransactionPlugin` (in AppDelegate.swift, registered in `NoZoomBridgeViewController.capacitorDidLoad`) returns StoreKit 2 `AppTransaction` (iOS 16+, verified only). JS stores `originalAppVersion` in the mark, **log only**. It is the first-download **build number**; sandbox and TestFlight say "1.0".
- Nothing is gated. The free build (1.4) grants **Core only** from this mark. The Prayer Book is $9.99 for everyone.
- Support minting: `mintPaidBuyerCode({ platform: 'support' })`.
