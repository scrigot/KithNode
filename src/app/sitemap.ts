import type { MetadataRoute } from "next";

const routes = ["", "/demo", "/waitlist", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-05-02");

  return routes.map((route) => ({
    url: `https://kithnode.ai${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
