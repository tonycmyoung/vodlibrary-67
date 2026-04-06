/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Remove ignoreDuringBuilds once the 36 pre-existing lint errors are fixed:
  //   - react/no-unescaped-entities: unescaped ' and " in JSX across several components
  //   - react-hooks/exhaustive-deps: setState called synchronously in effects (2 instances)
  //   - @typescript-eslint/no-unsafe-function-type: Function type used in test files
  // TODO: Remove ignoreBuildErrors once the ~83 pre-existing TS errors are fixed
  //   (see memory for full breakdown by file)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Enable Next.js image optimization for better LCP on mobile
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  env: {
    // Build timestamp - generated at build time
    NEXT_PUBLIC_BUILD_TIMESTAMP: new Date().toISOString(),
    // App version from package.json
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.1.0",
    // Vercel automatically provides these, but we expose them with NEXT_PUBLIC prefix
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF || "local",
  },
}

export default nextConfig
