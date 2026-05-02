import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleVerifyShopVerifyTac } from "../lib/memberVerifyShopLoginTac.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = req.body as { phone?: string; code?: string } | undefined;
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const code = typeof body?.code === "string" ? body.code : "";

  const out = await handleVerifyShopVerifyTac({ rawPhone: phone, rawCode: code });
  if (out.ok === true) {
    res.status(200).json({ ok: true, token_hash: out.token_hash });
    return;
  }
  res.status(out.status).json({ error: out.error });
}
