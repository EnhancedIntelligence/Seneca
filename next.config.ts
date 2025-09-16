import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  eslint: {
    // Strict in CI, relaxed locally
    ignoreDuringBuilds: process.env.CI ? false : true,
  },
  async headers() {
    // Build Content Security Policy
    // Note: We need specific allowances for Supabase features
    const csp = [
      "default-src 'self'",
      // Next.js dev needs inline/eval for HMR; production stays strict
      `script-src 'self'${isProd ? "" : " 'unsafe-inline' 'unsafe-eval'"}`,
      // Inline styles needed for Tailwind and component libraries
      "style-src 'self' 'unsafe-inline'",
      // Disallow legacy plugins (Flash, Java, etc.)
      "object-src 'none'",
      // Images from self, data URIs, blob URLs, and Supabase storage
      "img-src 'self' data: blob: https://*.supabase.co",
      // Fonts from self and data URIs
      "font-src 'self' data:",
      // Critical: Allow Supabase connections including WebSocket for realtime
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co blob:",
      // Media sources for audio/video recording and playback
      "media-src 'self' blob: https://*.supabase.co",
      // Web Workers for audio processing
      "worker-src 'self' blob:",
      // Prevent clickjacking by not allowing this app to be embedded
      "frame-ancestors 'none'",
      // Restrict which sites we can embed (tight by default)
      "frame-src 'self'",
      // Restrict base tag usage
      "base-uri 'self'",
      // Form submissions only to same origin
      "form-action 'self'",
      // TODO: When adding analytics/monitoring, extend these allowlists:
      // script-src: add https://cdn.posthog.com https://browser.sentry-cdn.com
      // connect-src: add https://app.posthog.com https://o*.ingest.sentry.io
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
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
            value: "geolocation=(), microphone=(self), camera=(), fullscreen=(self)",
          },
          // Only add HSTS in production
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                  // Note: Only add "; preload" if submitting to hstspreload.org
                },
              ]
            : []),
          // Optional: Cross-Origin Isolation for enhanced security
          // Enables SharedArrayBuffer, high-res timers, and better worker performance
          // WARNING: May break third-party iframes that don't set CORP/COEP
          // Uncomment if you don't embed external iframes:
          // { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
