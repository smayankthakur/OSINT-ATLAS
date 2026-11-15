/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // CSP allows the map's tile/style hosts + our own API. Tighten per deploy.
  { key: "Content-Security-Policy", value:
    "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; " +
    "connect-src 'self' https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com " +
    "https://earthquake.usgs.gov https://api.tfl.gov.uk https://eonet.gsfc.nasa.gov; " +
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://webcams.windy.com; " +
    "script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
