# Google Play Store Readiness

## Current Android package

- App name: Alien Base Defense
- Package name: com.netsammy.alienbasedefense
- Version: 1.0, versionCode 1
- Target SDK: 36
- Min SDK: 22
- Orientation: landscape
- Release artifact path: android/app/build/outputs/bundle/release/app-release.aab

## Build commands

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat bundleRelease
```

## Release signing

Google Play requires a signed Android App Bundle. This project reads signing details from Gradle properties or environment variables:

```powershell
$env:ALIEN_RELEASE_STORE_FILE="C:\path\to\upload-keystore.jks"
$env:ALIEN_RELEASE_STORE_PASSWORD="..."
$env:ALIEN_RELEASE_KEY_ALIAS="upload"
$env:ALIEN_RELEASE_KEY_PASSWORD="..."
```

Do not commit the keystore or passwords. If these values are missing, `bundleRelease` still builds an unsigned AAB that is useful for local validation but not upload-ready.

Verify signing before upload:

```powershell
jarsigner -verify -verbose -certs android\app\build\outputs\bundle\release\app-release.aab
```

## Play Console declarations

- Data safety: current build stores progress locally and does not intentionally collect or share user data.
- Ads: current build has no ad SDK. After AdMob IDs are added, mark the app as containing ads and update Data safety for the ad SDK.
- Privacy policy: use a public HTTPS URL. The web build includes `privacy.html`, but Play Console needs the deployed URL.
- App category: Game.
- Content rating: complete the Play Console questionnaire for fantasy/sci-fi shooting action.

## Android performance note

The native Android shell disables automatic GLB parsing and uses the procedural in-game models. The browser/PWA build can still load GLBs. This avoids Android WebView stalls from parsing the large model files during gameplay startup.

## Pre-upload checklist

- Build signed AAB with the upload key.
- Test the signed release on a physical Android phone if possible.
- Upload to internal testing first, then production after review.
- Prepare feature graphic, screenshots, short description, full description, privacy policy URL, and contact email.
- Rebuild and retest after adding AdMob app ID and ad unit IDs.
