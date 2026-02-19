import withPWA from '@ducanh2912/next-pwa'

const pwa = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        // Ne jamais mettre en cache les appels API Railway
        urlPattern: /^https:\/\/.*\.railway\.app\/.*/i,
        handler: 'NetworkOnly',
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default pwa(nextConfig)
