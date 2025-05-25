import type { NextConfig } from "next";
// import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'plum-tough-mongoose-147.mypinata.cloud',
        port: '',
        pathname: '/ipfs/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        child_process: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

// if (process.env.NODE_ENV === 'development') {
//   await setupDevPlatform();
// }

export default nextConfig;
