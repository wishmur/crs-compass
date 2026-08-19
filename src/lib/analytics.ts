import posthog from "posthog-js";

export const EVENTS = {
  LANDING_VIEWED: "landing_viewed",
  HISTORY_VIEWED: "history_viewed",
  HISTORY_FILTER_USED: "history_filter_used",
  CHART_SERIES_TOGGLED: "chart_series_toggled",
  WIHBI_STARTED: "wihbi_started",
  WIHBI_SCORE_ENTERED: "wihbi_score_entered",
  WIHBI_ELIGIBILITY_CHANGED: "wihbi_eligibility_changed",
  WIHBI_RESULT_VIEWED: "wihbi_result_viewed",
  OFFICIAL_SOURCE_CLICKED: "official_source_clicked",
  ABOUT_VIEWED: "about_viewed",
} as const;

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  const key = import.meta.env['VITE_POSTHOG_KEY'] as string | undefined;
  if (!key) return;
  posthog.init(key, {
    api_host: (import.meta.env['VITE_POSTHOG_HOST'] as string) || "https://us.i.posthog.com",
    capture_pageview: false,
    // 'identified_only' is PostHog's default. 'never' silently drops events
    // when the project has "Discard anonymous events" enabled — which it is
    // by default — so we were capturing nothing.
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function capture(event: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, props);
}

export function capturePageview(path: string) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: window.location.origin + path });
}
