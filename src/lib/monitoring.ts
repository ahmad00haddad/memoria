// Error monitoring (Sentry) — no-op safe when VITE_SENTRY_DSN is unset.
let initialized = false;

export function initMonitoring() {
  if (initialized || typeof window === "undefined") return;
  const dsn = import.meta.env['VITE_SENTRY_DSN'] as string | undefined;
  if (!dsn) return;
  initialized = true;

  void import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend(event) {
        // لا نرسل بيانات حسّاسة
        if (event.request?.cookies) delete event.request.cookies;
        return event;
      },
    });
  });
}