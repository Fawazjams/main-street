import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Craigslist serves its photo CDN without hotlink protection - verified
    // 200 image/jpeg with a foreign referer - so listing photos can be shown
    // directly rather than proxied or re-hosted.
    remotePatterns: [
      { protocol: "https", hostname: "images.craigslist.org", pathname: "/**" },
    ],
  },
};

export default nextConfig;
