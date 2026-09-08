/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: '/:path*.html',
        },
      ],
    }
  },
};

export default nextConfig;
