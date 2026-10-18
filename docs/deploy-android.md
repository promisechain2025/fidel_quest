# Android: automatic builds to Google Play (internal testing)

`.github/workflows/android-play.yml` runs on every push/merge to `main` that
touches the app (and by hand from **Actions > Android -> Google Play > Run
workflow**). It:

1. runs the unit tests, `npm run build` and `npx cap sync android`
   (same in-app purchase guard as the iOS Xcode Cloud script: fails if
   `VITE_STORE_IAP` / `VITE_MONETIZE` is set or `full_app` is in the bundle);
2. builds `app-release.aab` with `./gradlew bundleRelease`, signed with the
   **upload key** (`egeez-upload.jks`), and fails if the bundle is unsigned or
   signed with any other certificate;
3. keeps the `.aab` as a workflow artifact for 30 days;
4. uploads it to the Play **Internal testing** track of
   `net.promisechain.fidelquest`.

Production is never touched automatically; you promote by hand (step 4).

Until the one-time setup below is done the workflow just shows a
"Play upload skipped" notice and stays green.

## versionCode / versionName

- `versionName` comes from `android/app/build.gradle` (bump it there per release, e.g. `1.3.1` -> `1.3.2`).
- `versionCode` is set automatically to **100 + the workflow's run number**
  (run 1 -> 101, run 2 -> 102 ...), passed as `-PegeezVersionCode`. It always
  goes up and is far above the codes uploaded by hand (up to 8). Local builds
  without the property still use `8`.
- Do not upload a hand-built bundle with a code above the CI codes, or the
  next CI upload will be rejected as a lower version.

## One-time setup

### 1. Upload key reset (pending)

Play App Signing is on: Google keeps the app signing key, we only hold the
upload key. The new upload key is `egeez-upload.jks` (alias `upload`,
certificate SHA-256 `7F:83:6B:D6:...:7A:EB:74`, full value in
`APP-STORE.md`). Play only accepts bundles signed with it **after** the reset
request is approved:

Play Console > eGeez > **Protected with Play > Play Store protection >
Manage Play app signing** > *Upload key certificate* > **Request upload key
reset** > "I lost my upload key" > upload `upload_certificate.pem` > Request.
(If the button is missing, use https://support.google.com/googleplay/android-developer/contact/key.)

Google emails when it is approved; the new key works from the date in that email.

### 2. Play service account (the robot that uploads)

1. Google Cloud Console (https://console.cloud.google.com), pick or create a
   project (e.g. "egeez-play").
2. **APIs & Services > Library** > enable **Google Play Android Developer API**.
3. **IAM & Admin > Service accounts > Create service account**, name
   `egeez-play-uploader`. No Cloud roles are needed; skip that step.
4. Open it > **Keys > Add key > Create new key > JSON**. A `.json` file
   downloads. Treat it like a password.
5. Copy its email (`egeez-play-uploader@<project>.iam.gserviceaccount.com`).
6. Play Console (account level, not inside the app) > **Users and
   permissions > Invite new users** > paste that email > **App permissions >
   Add app > eGeez** > tick **Release apps to testing tracks**.
   Also tick **Release to production, exclude devices, and use Play App
   Signing** only if you later want CI to be able to publish to production
   (not needed for this workflow). > **Invite user** / Apply.
   It can take up to 24-36 hours before a new service account is accepted
   by the API.
7. Make sure **Test and release > Testing > Internal testing** has a testers
   list (your email at least), so you can install the CI builds.

### 3. GitHub secrets

GitHub > `promisechain2025/fidel_quest` > **Settings > Secrets and variables
> Actions > New repository secret**:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 egeez-upload.jks` (macOS: `base64 -i egeez-upload.jks`) |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password (`storePassword` in `keystore.properties`) |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | key password (`keyPassword`; same as the store password if not set separately) |
| `PLAY_SERVICE_ACCOUNT_JSON` | the whole content of the JSON key file from step 2 |

With the GitHub CLI:

```bash
base64 -w0 egeez-upload.jks | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD     # prompts for the value
gh secret set ANDROID_KEY_ALIAS --body upload
gh secret set ANDROID_KEY_PASSWORD
gh secret set PLAY_SERVICE_ACCOUNT_JSON < egeez-play-uploader.json
```

Never commit the keystore, its passwords or the JSON key (`*.jks`,
`*.keystore`, `keystore.properties` are gitignored). Then start one run by
hand (**Actions > Android -> Google Play > Run workflow**) to check it.

### 4. Promote internal -> production

1. Install the build from the internal testing link and check it on a phone.
2. Play Console > eGeez > **Test and release > Testing > Internal testing >
   Releases** > on the release, **Promote release > Production**.
   (Or **Production > Create new release > Add from library** and pick the
   versionCode.)
3. Add release notes, **Next** > **Save and publish** (Google reviews it;
   with managed publishing on you press **Publish** once approved).

## Troubleshooting

- *"Play upload skipped" notice*: a secret is missing; see step 3.
- *"Bundle is not signed" / "signed with ... not the Play upload key"*: the
  `ANDROID_*` secrets are wrong or point at another keystore.
- *"The Android App Bundle was signed with the wrong key"* from Play: the upload key reset (step 1) is not approved yet.
- *"The caller does not have permission"*: the service account invite in step 2.6 is missing, not accepted yet, or lacks "Release apps to testing tracks".
- *"Version code N has already been used"*: a run was re-run after a successful upload; start a new run instead.
