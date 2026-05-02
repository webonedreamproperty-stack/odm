import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { articles } from "../data/articles.data.js";

const SITE_ORIGIN = "https://odgoldmember.com";
const OUTPUT_PATH = resolve(process.cwd(), "public", "sitemap.xml");

const staticRoutes = [
  { path: "/", lastmod: "2026-03-03", changefreq: "weekly", priority: "1.0" },
  { path: "/showcase", lastmod: "2026-03-03", changefreq: "weekly", priority: "0.8" },
  { path: "/articles", lastmod: "2026-03-03", changefreq: "weekly", priority: "0.8" },
  { path: "/privacy-policy", lastmod: "2026-03-03", changefreq: "monthly", priority: "0.5" },
  { path: "/cookie", lastmod: "2026-03-09", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", lastmod: "2026-03-03", changefreq: "monthly", priority: "0.5" },
];

const formatDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid article date: ${value}`);
  }

  return parsed.toISOString().slice(0, 10);
};

const routes = [
  ...staticRoutes,
  ...articles.map((article) => ({
    path: article.href,
    lastmod: formatDate(article.publishedDate),
    changefreq: "monthly",
    priority: "0.7",
  })),
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map(
    (route) => [
      "  <url>",
      `    <loc>${SITE_ORIGIN}${route.path}</loc>`,
      `    <lastmod>${route.lastmod}</lastmod>`,
      `    <changefreq>${route.changefreq}</changefreq>`,
      `    <priority>${route.priority}</priority>`,
      "  </url>",
    ].join("\n")
  ),
  "</urlset>",
  "",
].join("\n");

writeFileSync(OUTPUT_PATH, xml, "utf8");
