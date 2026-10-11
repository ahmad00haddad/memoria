import { createContext, useContext } from "react";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";

/**
 * First-visit intro gate.
 *
 * The full entrance choreography (rises, drawn gold lines, count-ups…) plays
 * only during a browser's first visit. Once the visit has started, a cookie is
 * set and every later page load renders straight into its finished state, so
 * returning users (a photographer opening her dashboard daily) never wait on
 * motion. Interaction motion — galleries, filters, booking steps — is not gated.
 *
 * It's a cookie rather than localStorage so the server can render the right
 * starting state and there's no flash. `?intro` in the URL replays it.
 */
export const INTRO_COOKIE = "memoria_intro_seen";

/** true when this page load should play the intro. */
export const readIntro = createIsomorphicFn()
  .server(() => {
    if (new URL(getRequest().url).searchParams.has("intro")) return true;
    return getCookie(INTRO_COOKIE) !== "1";
  })
  .client(() => {
    if (new URLSearchParams(window.location.search).has("intro")) return true;
    return !document.cookie.split("; ").includes(`${INTRO_COOKIE}=1`);
  });

export function markIntroSeen() {
  document.cookie = `${INTRO_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export const IntroContext = createContext(true);

/** Whether entrance animations should play on this page load. */
export function useIntro() {
  return useContext(IntroContext);
}
