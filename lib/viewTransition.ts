/**
 * Runs a DOM update inside the View Transitions API when supported (Chrome 111+, Safari 18+).
 * Falls back to a synchronous update elsewhere.
 */
export function startViewTransition(update: () => void): void {
  const doc = typeof document !== "undefined" ? document : null;
  const fn = doc && "startViewTransition" in doc ? (doc as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition : null;
  if (typeof fn === "function") {
    fn.call(doc, update);
  } else {
    update();
  }
}
