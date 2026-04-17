import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  cacheOnNavigation: true,
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wts/shared'],
  typedRoutes: true,
  webpack: (config) => {
    // Resolve .ts files when @wts/shared uses .js extensions (ESM convention)
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.js'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
};

export default withNextIntl(withSerwist(nextConfig));
