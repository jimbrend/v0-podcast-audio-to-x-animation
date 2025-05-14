/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["ytdl-core", "node-web-audio-api"],
  },
  webpack: (config) => {
    config.externals.push({
      "node-web-audio-api": "commonjs node-web-audio-api",
    })
    return config
  },
}

export default nextConfig
