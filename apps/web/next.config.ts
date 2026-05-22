import withSerwistInit from '@serwist/next';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
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
  // Standalone output for Docker: bundles server.js + traced node_modules.
  // outputFileTracingRoot points to the monorepo root so pnpm workspace deps
  // are correctly traced (server.js ends up at apps/web/server.js in the image).
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
