# Alien Base Defense - Windows Store Submission

## Current Build Status

- Production web build: `npm run build`
- Runtime dependency audit: `npm audit --omit=dev`
- Public PWA URL: `https://netsammy.github.io/AlienBaseDefense/`
- PWA manifest: `public/manifest.webmanifest`
- Privacy policy page: `public/privacy.html`
- Install icons: `public/icons/icon-192.png`, `public/icons/icon-256.png`, `public/icons/icon-512.png`
- Generated build output: `dist/`

## Microsoft Store Listing Draft

### App Name

Alien Base Defense

### Short Description

Defend a futuristic base from alien waves in a fast single-player 3D survival shooter.

### Description

Alien Base Defense drops you into a besieged sci-fi defense zone where alien waves rush your base shield. Move, sprint, reload, and fire a plasma rifle while support towers slow and damage incoming enemies. Clear waves, choose upgrades, earn coins, and survive tougher alien variants across city-themed arenas.

Features:

- Single-player first-person base defense combat
- Multiple difficulty modes and wave progression
- Alien variants including runners, brutes, and boss waves
- Upgrade choices between waves
- Persistent coins and permanent upgrades
- Local best score and save data
- Keyboard/mouse controls with mobile touch controls for compatible devices
- Adjustable graphics quality presets

### Search Keywords

alien, base defense, shooter, survival, fps, tower defense, sci-fi, arcade, action, wave defense

### Category

Games / Shooter or Games / Action

### Age Rating Notes

Sci-fi combat against non-human alien enemies. No realistic human violence, gambling, user-generated content, chat, account login, or in-app purchases are currently present.

### Privacy Notes

The app stores best score, coins, selected stage, graphics quality, and upgrade progress locally on the device through browser local storage. It does not include analytics, advertising SDKs, account login, multiplayer, or cloud saves.

### Suggested System Requirements

Minimum:

- Windows 10 or later
- WebView2 / modern Microsoft Edge runtime
- WebGL-capable graphics hardware
- Keyboard and mouse
- 4 GB RAM

Recommended:

- Windows 11
- Dedicated or modern integrated GPU with hardware acceleration enabled
- 8 GB RAM
- 1920x1080 display

## Upload Checklist

1. Reserve the app name in Microsoft Partner Center.
2. Deploy the `dist/` build to `https://netsammy.github.io/AlienBaseDefense/`.
3. Open PWABuilder and package the HTTPS PWA URL for Windows.
4. Use the Partner Center Product Identity values when generating the Windows package.
5. Upload the generated `.msixbundle`, `.appxbundle`, or `.msixupload` package to Partner Center.
6. Upload screenshots, store logo, tile/logo images, and trailer/key art if available.
7. Enter `https://netsammy.github.io/AlienBaseDefense/privacy.html` as the privacy URL.
8. Complete the age rating questionnaire using the notes above.
9. Run Microsoft Store pre-submission checks and fix any reported packaging issues.
10. Submit for certification.

## Remaining Recommended Improvements

- Capture real gameplay screenshots from the final hosted build.
- Create a 15-30 second gameplay trailer.
- Replace generated placeholder listing art with final branded key art.
- Upgrade Capacitor later if Android packaging remains in scope. The Windows web runtime audit is clean with `npm audit --omit=dev`, but full dev-tool audit still reports the current Capacitor CLI tar advisory.
