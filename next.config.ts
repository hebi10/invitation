import type { NextConfig } from "next";

const shouldDisableWebpackBuildWorker =
  process.env.NEXT_DISABLE_WEBPACK_BUILD_WORKER === "true" ||
  (process.platform === "win32" && process.env.CI !== "true");
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://*.kakaocdn.net",
  "media-src 'self' data: blob: https://firebasestorage.googleapis.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.kakaocdn.net https://dapi.kakao.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firebasestorage.googleapis.com https://api.revenuecat.com https://dapi.kakao.com",
  "frame-src 'self' https://*.firebaseapp.com",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.googleusercontent.com https://*.kakaocdn.net",
  "media-src 'self' data: blob: https://firebasestorage.googleapis.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://t1.kakaocdn.net https://dapi.kakao.com",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firebasestorage.googleapis.com https://api.revenuecat.com https://dapi.kakao.com",
  "frame-src 'self' https://*.firebaseapp.com",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

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
  async headers() {
    const securityHeaders = [
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      {
        key: isProduction ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
        value: isProduction ? contentSecurityPolicy : contentSecurityPolicyReportOnly,
      },
      ...(isProduction
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains; preload",
            },
          ]
        : []),
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
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
