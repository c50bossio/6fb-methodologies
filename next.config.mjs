/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router Configuration
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      'react-markdown',
      'react-syntax-highlighter'
    ],
    serverComponentsExternalPackages: ['pg', '@aws-sdk/client-s3'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Performance Optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Bundle Analysis (enabled via ANALYZE=true)
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
    },
  }),

  // Image Optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: ['localhost', 'vercel.app'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
    ],
  },

  // Security Headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/api/workbook/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },

  // Environment Variables Validation
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },

  // Webpack Configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Audio file support
    config.module.rules.push({
      test: /\.(mp3|wav|ogg|m4a)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/audio/',
          outputPath: 'static/audio/',
        },
      },
    });

    // Performance optimizations
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        workbook: {
          name: 'workbook',
          test: /[\\/]src[\\/](components[\\/]workbook|app[\\/]workbook)/,
          chunks: 'all',
          priority: 20,
        },
        ui: {
          name: 'ui',
          test: /[\\/]node_modules[\\/](@radix-ui|@headlessui)/,
          chunks: 'all',
          priority: 10,
        },
      };
    }

    return config;
  },

  // TypeScript Configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint Configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/workbook',
        destination: '/workbook/dashboard',
        permanent: false,
      },
    ];
  },
}

export default nextConfig