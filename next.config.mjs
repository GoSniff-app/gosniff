/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'gosniff.vercel.app' }],
        destination: 'https://gosniff.app/:path*',
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
