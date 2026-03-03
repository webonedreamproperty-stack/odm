import { track } from "@vercel/analytics";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export const trackEvent = (name: string, properties?: AnalyticsProperties) => {
  try {
    track(name, properties);
  } catch {
    // Analytics should never block product behavior.
  }
};
