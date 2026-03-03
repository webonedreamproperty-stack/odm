import { articles as articleEntries } from "./articles.data.js";

export interface ArticleSummary {
  slug: string;
  title: string;
  excerpt: string;
  publishedDate: string;
  readTime: string;
  href: string;
  coverClassName: string;
  coverAccentClassName: string;
}

export const articles = articleEntries as ArticleSummary[];

export const featuredArticle = articles[0];
