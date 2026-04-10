/** GA4 measurement ID (same as gtag.js in index.html). */
export const GA_MEASUREMENT_ID = "G-LNPE0BRD1F" as const;

/** SPA route change — use `page_view` event so we do not double-count the first load (handled in index.html). */
export function sendGaPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === "undefined") return;
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "page_view", {
    page_path: pagePath,
    page_title: pageTitle ?? (typeof document !== "undefined" ? document.title : undefined),
  });
}
