import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ippan.uk";
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/technology` },
    { url: `${base}/devnet` },
    { url: `${base}/docs` },
    { url: `${base}/contact` },
  ];
}
