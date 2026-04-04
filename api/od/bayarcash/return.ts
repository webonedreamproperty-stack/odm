import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleOdRenewalReturn, readSupabaseServerEnv } from "./lib/bayarcashOdPayment.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const result = await handleOdRenewalReturn(req.query as Record<string, unknown>);
  const env = readSupabaseServerEnv();
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const base =
    env?.appOrigin.replace(/\/+$/, "") ||
    process.env.APP_BASE_URL?.replace(/\/+$/, "") ||
    process.env.APP_ORIGIN?.replace(/\/+$/, "") ||
    vercel ||
    "http://localhost:3001";

  if (result.outcome === "success") {
    res.redirect(302, `${base}/od/account?od_pay=success`);
    return;
  }
  const q = new URLSearchParams();
  q.set("od_pay", "error");
  q.set("reason", result.reason);
  if (result.outcome === "failed" && result.detail) {
    q.set("detail", result.detail.slice(0, 400));
  }
  res.redirect(302, `${base}/od/account?${q.toString()}`);
}
