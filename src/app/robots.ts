import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/settings", "/my-photos"],
      },
    ],
    sitemap: "https://catchmyactions.com/sitemap.xml",
  };
}
