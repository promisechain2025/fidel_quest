# 1.4.2 release notes (DRAFT, not submitted to any store)

Version is already **1.4.2** in `package.json`, Android `versionName`, and the Xcode project. No bump needed.
Android 1.4.1 is live; iOS 1.4.2 is not yet released. Paste into App Store Connect "What's New" and the Play "Release notes" by hand once Yosief approves.

## What changed since 1.4.1 (PRs #94 to #101)
- #94 Word Bricks (renamed from Brick Words)
- #95 Block Church: all consonant families, church wall per child, responsive layout
- #96 Brick games fit every screen size
- #98 Prayer book: Next carries on from one day to the next
- #99 Word Bricks words follow the selected language
- #100 Rotation, zoom and hold robustness
- #101 App-level progress (home bar and sheet, ጸሎት tracker, parent progress card for the website)

## What's New (Apple, English) - about 330 characters
```
New: a progress bar on the home screen shows every place your child has explored in eGeez, with a ጸሎት (prayer book) tracker.
Grown-ups can share a private progress card from the grown-ups area. It opens on easygeez.com and nothing is uploaded.
Also: Word Bricks, Block Church, a prayer book that carries on to the next day, and screens that turn and zoom smoothly.
```

## Release notes (Google Play, 500 character limit) - about 300 characters
```
New: a home progress bar shows every place your child has explored, plus a ጸሎት tracker. Grown-ups can share a private progress card (nothing is uploaded). Word Bricks and Block Church improved, the prayer book carries on to the next day, and every screen turns and fits better.
```

## Kid-safe and store rules checklist
- No ads, accounts or tracking added. Progress stays on the device; the share card is a fragment link (`#p=`) that the website decodes in the browser and never sends to a server.
- Card carries counts, masks and the child's first name only (no answers, no timestamps). It is made behind the grown-up gate, not by the child.
- Store screenshots: fidel and numbers only, no English words drawn on the images. Review shots are in `egeez-brick-samples/shots/review-*.png` (these are internal review shots, not store art).
- Amharic and Tigrinya are never UI languages; the notes above are English store text only.
