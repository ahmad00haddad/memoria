# 📱 Turning EliteCapture into native iOS & Android apps

EliteCapture ships as an **installable PWA** out of the box (Add to Home Screen
on iOS & Android, offline support). For the app stores there are two paths.

---

## Path A — Google Play in minutes (PWABuilder, recommended first)
1. Deploy the site (the PWA must be live over HTTPS).
2. Go to <https://www.pwabuilder.com>, enter your URL.
3. Download the **Android (TWA)** package and upload it to Google Play.
No native code to maintain — it reuses the live PWA.

---

## Path B — iOS App Store + Play with a native shell (Capacitor)
This repo includes `capacitor.config.ts`. Because the app is server-rendered,
the native shell loads the **live deployed site** (`server.url`) rather than a
bundled build — so app content stays in sync with the website automatically.

### One-time setup
```bash
# Install Capacitor tooling
npm i @capacitor/core @capacitor/app @capacitor/status-bar @capacitor/splash-screen
npm i -D @capacitor/cli
npm i @capacitor/ios @capacitor/android

# Create the native projects
npx cap add ios
npx cap add android
```

### Update the URL
Edit `capacitor.config.ts` → `server.url` to your production domain.

### Run / open
```bash
npx cap sync          # after any config/plugin change
npx cap open ios      # opens Xcode    (requires macOS + Apple Developer acct $99/yr)
npx cap open android  # opens Android Studio (Google Play one-time $25)
```

### Publish
- **iOS:** Archive in Xcode → upload to App Store Connect → submit for review.
- **Android:** Build a signed AAB in Android Studio → upload to Play Console.

### Notes
- App icons / splash: generate with `@capacitor/assets` from a 1024×1024 source.
- For native push notifications later, add `@capacitor/push-notifications`.
- The `dist` webDir is a Capacitor requirement but unused while `server.url` is set.

---

## Which should I choose?
| Goal | Path |
|------|------|
| Fastest, free, all phones | PWA (already done) |
| Google Play presence | A (PWABuilder) |
| App Store + native features (push, etc.) | B (Capacitor) |
