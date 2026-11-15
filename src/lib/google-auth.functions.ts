import { createServerFn } from "@tanstack/react-start";

// Google One Tap needs the OAuth web client ID in the browser (it is public, not a secret).
// It must be the same client Supabase's Google provider uses ("Web client 1"), so Supabase
// accepts the ID token. GOOGLE_CLIENT_ID is the separate Calendar client: never use it here.
const SIGN_IN_CLIENT_ID = "600001928515-0vl036pekthk91n2p5n8eskr1mq5qvuh.apps.googleusercontent.com";

export const getGoogleClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.GOOGLE_ONETAP_CLIENT_ID || SIGN_IN_CLIENT_ID };
});
