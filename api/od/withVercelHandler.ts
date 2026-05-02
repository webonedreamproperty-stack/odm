import type { VercelRequest, VercelResponse } from "@vercel/node";

type VercelHandler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;

/** Wraps Vercel Node handlers with consistent error logging and a JSON 500 fallback. */
export function withVercelHandler(routeLabel: string, handler: VercelHandler): VercelHandler {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      await handler(req, res);
    } catch (e) {
      console.error(`[api/${routeLabel}]`, e);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error." });
      }
    }
  };
}
