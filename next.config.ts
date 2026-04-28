import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/lee-jonghun-choi-in-simple",
        destination: "/lee-jonghun-choi-in/simple",
        permanent: true,
      },
      {
        source: "/lee-jonghun-choi-in-simple/",
        destination: "/lee-jonghun-choi-in/simple/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
