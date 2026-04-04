import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleCreateOdRenewalIntent } from "../../lib/bayarcashOdPayment";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = req.headers.authorization;
  const accessToken =
    typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  const body = req.body as { plan?: string } | undefined;
  const plan = typeof body?.plan === "string" ? body.plan : "";

  if (!accessToken) {
    res.status(401).json({ error: "Missing access token." });
    return;
  }

  const out = await handleCreateOdRenewalIntent({ accessToken, plan });
  if (out.ok === true) {
    res.status(200).json({ url: out.url });
    return;
  }
  res.status(out.status).json({ error: out.error });
}
