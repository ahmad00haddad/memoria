import { createServerFn } from "@tanstack/react-start";

// Google One Tap needs the OAuth web client ID in the browser (it is public).
// GOOGLE_ONETAP_CLIENT_ID wins when the sign-in client differs from the calendar one.
export const getGoogleClientId = createServerFn({ method: "GET" }).handler(async () => {
  return { clientId: process.env.GOOGLE_ONETAP_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || null };
});
