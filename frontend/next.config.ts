import type { NextConfig } from "next";

// Get basePath from environment variable, default to empty string
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Static export configuration for GitHub Pages
  output: process.env.NEXT_EXPORT === "true" ? "export" : undefined,
  basePath: basePath,
  trailingSlash: true,
  
  // Images configuration for static export
  images: {
    unoptimized: true,
  },

  // Headers only work in non-static mode
  ...(process.env.NEXT_EXPORT !== "true" && {
    headers() {
      // Required by FHEVM 
      return Promise.resolve([
        {
          source: '/',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
          ],
        },
      ]);
    }
  }),
};

export default nextConfig;

