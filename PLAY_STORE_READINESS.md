# Google Play Store Readiness

## Current Android package

- App name: Alien Base Defense
- Package name: com.netsammy.alienbasedefense
- Version: 1.1.2, versionCode 7
- Target SDK: 36 (Complies with Google Play Target SDK >= 34 requirement)
- Min SDK: 24 (Android 7.0+)
- Orientation: landscape
- Release artifact path: `release/AlienBaseDefense-v1.1.2-versionCode7-unsigned.aab`
- Upload keystore: `release/alien-base-defense-upload.jks`

## Build commands

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat bundleRelease
```

## Release signing

Google Play requires a signed Android App Bundle.

### Option 1: Direct Sign with jarsigner

From the `alien_base_defense_game/release` directory:

```powershell
jarsigner -keystore alien-base-defense-upload.jks -signedjar AlienBaseDefense-v1.1.2-versionCode7-production.aab AlienBaseDefense-v1.1.2-versionCode7-unsigned.aab upload
```
*(Enter your keystore password when prompted)*

### Option 2: Environment variables before `bundleRelease`

```powershell
$env:ALIEN_RELEASE_STORE_FILE="G:\AI Games\AlienBaseDefenseGame\alien_base_defense_game\release\alien-base-defense-upload.jks"
$env:ALIEN_RELEASE_STORE_PASSWORD="your-password"
$env:ALIEN_RELEASE_KEY_ALIAS="upload"
$env:ALIEN_RELEASE_KEY_PASSWORD="your-password"
cd android
.\gradlew.bat bundleRelease
```

### Verify signing before upload:

```powershell
jarsigner -verify -verbose -certs release\AlienBaseDefense-v1.1.2-versionCode7-production.aab
```

## Play Console declarations

- **In-App Purchases:** "No" (The game is 100% Free-to-Play funded by optional ads and rewarded continues).
- **Ads:** "Yes, my app contains ads" (Google AdMob integrated with UMP consent).
- **Data safety:** Declare AdMob data collection (Device / Advertising ID, crash logs, app interactions).
- **Privacy policy:** `https://netsammy.github.io/AlienBaseDefense/privacy.html`
- **Target Audience:** Select **13+** (or 16+) to avoid COPPA / Families policy restrictions.
- **App category:** Game / Action / Shooter.
- **Content rating:** Complete the IARC questionnaire for sci-fi/fantasy shooter action against non-human aliens (no realistic human violence, no blood, no user-to-user chat).

## Pre-upload checklist

- [x] Mock $2.99 IAP removed to ensure 100% Google Play Payments Policy compliance.
- [x] Target SDK set to 36 (well above the minimum required 34).
- [x] High-res Icon (512x512) and Feature Graphic (1024x500) prepared in `store-assets/google-play/`.
- [x] Phone & Tablet screenshots prepared in `store-assets/google-play/`.
- [x] Official YouTube trailer published and linked: `https://www.youtube.com/watch?v=8Ub1xUpbR30`.
- [x] Privacy Policy live and publicly hosted over HTTPS.
- [ ] Sign `AlienBaseDefense-v1.1.2-versionCode7-unsigned.aab` using `alien-base-defense-upload.jks`.
- [ ] Upload signed `.aab` to Google Play Console (Closed Testing or Production).
