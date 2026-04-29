import type { NextConfig } from "next";

const shouldDisableWebpackBuildWorker =
  process.env.NEXT_DISABLE_WEBPACK_BUILD_WORKER === "true" ||
  (process.platform === "win32" && process.env.CI !== "true");

const nextConfig: NextConfig = {
  trailingSlash: true,
  ...(shouldDisableWebpackBuildWorker
    ? {
        experimental: {
          webpackBuildWorker: false,
        },
      }
    : {}),
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
