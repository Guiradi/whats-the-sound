import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSupabaseSession } from './lib/supabase/middleware';
import { requireAdmin } from './middleware/require-admin';

const intlMiddleware = createIntlMiddleware(routing);

const ADMIN_PATH_PATTERN = /^\/(?:pt-BR|en)\/admin(\/|$)/;

export default async function middleware(request: NextRequest) {
  // 1. Refresh the Supabase session first (sets auth cookies on its response).
  const supabaseResponse = await updateSupabaseSession(request);

  // 2. Gate /[locale]/admin/* before any routing — returns 404 for non-admins.
  if (ADMIN_PATH_PATTERN.test(request.nextUrl.pathname)) {
    const adminBlock = await requireAdmin(request);
    if (adminBlock) return adminBlock;
  }

  // 3. Run next-intl routing. This may issue a redirect (root → /<locale>/).
  const intlResponse = intlMiddleware(request);

  // If next-intl is redirecting, preserve Supabase cookies on the redirect response.
  if (intlResponse.headers.get('location')) {
    for (const cookie of supabaseResponse.cookies.getAll()) {
      intlResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        maxAge: cookie.maxAge,
        sameSite: cookie.sameSite,
        secure: cookie.secure,
      });
    }
    return intlResponse;
  }

  // Otherwise, forward the intl response headers/cookies onto the Supabase response.
  for (const [key, value] of intlResponse.headers.entries()) {
    if (!['content-length', 'content-type'].includes(key.toLowerCase())) {
      supabaseResponse.headers.set(key, value);
    }
  }
  return supabaseResponse;
}

export const config = {
  // Match all routes EXCEPT: api, _next, _vercel, files with extensions (covers
  // favicon.png, icon-*.png, manifest.webmanifest, sw.js, swe-worker-*.js, etc.),
  // the offline fallback page which must render without any i18n routing, and
  // /auth/* route handlers (OAuth callback) which are locale-agnostic.
  matcher: ['/((?!api|_next|_vercel|offline|auth|.*\\..*).*)'],
};
