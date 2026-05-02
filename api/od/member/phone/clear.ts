import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleMemberPhoneClear } from "../lib/memberPhoneTac.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const auth = req.headers.authorization;
  const accessToken =
    typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";

  if (!accessToken) {
    res.status(401).json({ error: "Missing access token." });
    return;
  }

  const out = await handleMemberPhoneClear({ accessToken });
  if (out.ok === true) {
    res.status(200).json({ ok: true });
    return;
  }
  res.status(out.status).json({ error: out.error });
}
