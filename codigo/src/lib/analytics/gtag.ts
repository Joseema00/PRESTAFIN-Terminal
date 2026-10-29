/**
 * Google Ads (Google Tag) integration.
 *
 * The global tag itself is injected once from the root route head
 * (`src/routes/__root.tsx`). This module only pushes events.
 *
 * No personally identifiable information (email, name, user id) is ever sent.
 */

export const GOOGLE_ADS_ID = "AW-18401816958";

/**
 * Google Ads conversion actions need a per-action label
 * (`AW-18401816958/<conversion_label>`). Fill these in once the conversion
 * actions are created in Google Ads; while a label is missing we still send the
 * plain event (usable for Google Analytics / imported conversions).
 */
export const CONVERSION_LABELS: Partial<Record<AdsEvent, string>> = {};

export type AdsEvent =
  | "simulator_start"
  | "simulator_complete"
  | "sign_up"
  | "begin_checkout"
  | "purchase";

type GtagParams = Record<string, unknown>;

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  if (!w.dataLayer) w.dataLayer = [];
  w.dataLayer.push(args);
}

/** Fires a conversion / event to Google Ads. Safe to call anywhere (no-op on SSR). */
export function trackAdsEvent(event: AdsEvent, params: GtagParams = {}) {
  const label = CONVERSION_LABELS[event];
  gtag("event", event, {
    ...(label ? { send_to: `${GOOGLE_ADS_ID}/${label}` } : {}),
    ...params,
  });
}

/** Manual page_view for client-side navigations (SPA routing). */
export function trackAdsPageView(path: string) {
  gtag("event", "page_view", {
    send_to: GOOGLE_ADS_ID,
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : path,
  });
}

/** Fires an event at most once per key (per browser). */
export function trackAdsEventOnce(key: string, event: AdsEvent, params: GtagParams = {}) {
  if (typeof window === "undefined") return;
  const storageKey = `prestafin.gads.${key}`;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
  } catch {
    /* storage unavailable — fire anyway */
  }
  trackAdsEvent(event, params);
}

const sessionFired = new Set<string>();

/** Fires an event at most once per page session (survives component remounts). */
export function trackAdsEventOncePerSession(key: string, event: AdsEvent, params: GtagParams = {}) {
  if (typeof window === "undefined") return;
  if (sessionFired.has(key)) return;
  sessionFired.add(key);
  trackAdsEvent(event, params);
}
