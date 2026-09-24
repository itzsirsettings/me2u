import type { MetadataRoute } from "next";

import { legalDocuments, supportDocuments } from "@/lib/legal-content";

const marketingUrl = "https://www.me2ulend.online";
const appUrl = "https://app.me2ulend.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages: MetadataRoute.Sitemap = [
    {
      url: marketingUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/legal`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${appUrl}/support`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const legalPages = legalDocuments
    .filter((document) => document.slug !== "legal-information")
    .map((document) => ({
      url: `${appUrl}/legal/${document.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    }));

  const supportPages = supportDocuments
    .filter((document) => document.slug !== "support")
    .map((document) => ({
      url: `${appUrl}/support/${document.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    }));

  return [...publicPages, ...legalPages, ...supportPages];
}
