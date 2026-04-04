import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";

import {
  handleCreateOdRenewalIntent,
  handleOdRenewalReturn,
  readSupabaseServerEnv,
} from "./api/od/bayarcash/lib/bayarcashOdPayment";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || "3001");

async function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.post("/api/od/bayarcash/create-intent", async (req, res) => {
    const auth = req.headers.authorization;
    const accessToken =
      typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
    const plan = typeof req.body?.plan === "string" ? req.body.plan : "";
    if (!accessToken) {
      res.status(401).json({ error: "Missing access token." });
      return;
    }
    const out = await handleCreateOdRenewalIntent({ accessToken, plan });
    if (out.ok === true) {
      res.json({ url: out.url });
      return;
    }
    res.status(out.status).json({ error: out.error });
  });

  app.get("/api/od/bayarcash/return", async (req, res) => {
    const result = await handleOdRenewalReturn(req.query as Record<string, unknown>);
    const env = readSupabaseServerEnv();
    const base = env?.appOrigin.replace(/\/+$/, "") ?? `http://127.0.0.1:${port}`;
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
  });

  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      configFile: path.join(root, "vite.config.ts"),
      server: { middlewareMode: true, host: "0.0.0.0", port },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        next();
        return;
      }
      try {
        const template = await fs.readFile(path.join(root, "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(root, "dist"), { index: false }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(root, "dist", "index.html"));
    });
  }

  return app;
}

const app = await createApp();
app.listen(port, "0.0.0.0", () => {
  console.log(`[server] http://localhost:${port}  (Bayarcash API + Vite)`);
});
