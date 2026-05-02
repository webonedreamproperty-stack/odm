import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleVerifyShopSendTac } from "../lib/memberVerifyShopLoginTac.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as { phone?: string } | undefined;
  const phone = typeof body?.phone === "string" ? body.phone : "";

  const out = await handleVerifyShopSendTac({ rawPhone: phone });
  if (out.ok === true) {
    res.status(200).json({ ok: true });
    return;
  }
  res.status(out.status).json({ error: out.error });
}
