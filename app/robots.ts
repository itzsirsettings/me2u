import type { MetadataRoute } from "next";

const marketingUrl = "https://www.me2ulend.online";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/kyc",
          "/loans",
          "/marketplace",
          "/profile",
          "/referrals",
          "/savings",
          "/security",
          "/wallet",
          "/withdraw",
          "/account-unlock",
          "/circles",
          "/deals",
          "/bills",
          "/r/",
        ],
      },
    ],
    sitemap: `${marketingUrl}/sitemap.xml`,
    host: marketingUrl,
  };
}
