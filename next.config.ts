import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
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