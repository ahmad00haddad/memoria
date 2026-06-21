import type { CapacitorConfig } from "@capacitor/cli";

// EliteCapture native shell (iOS + Android) via Capacitor.
//
// This app is server-rendered (TanStack Start on Cloudflare), not a static
// SPA, so the native shell loads the LIVE deployed site instead of a bundled
// web build. Update `server.url` to your production domain.
//
// Build steps are documented in CAPACITOR.md.
const config: CapacitorConfig = {
  appId: "com.elitecapture.app",
  appName: "EliteCapture",
  // Required by Capacitor even when loading a remote URL. `npm run build`
  // output; not actually served when `server.url` is set.
  webDir: "dist",
  server: {
    // The deployed production site the native shell wraps.
    url: "https://royal-lens-flow.lovable.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0c0c0c",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0c0c0c",
    },
  },
};

export default config;
