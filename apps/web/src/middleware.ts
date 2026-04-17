import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSupabaseSession } from './lib/supabase/middleware';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Refresh the Supabase session first (sets auth cookies on its response).
  const supabaseResponse = await updateSupabaseSession(request);

  // 2. Run next-intl routing. This may issue a redirect (root → /<locale>/).
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
  // and the offline fallback page which must render without any i18n routing.
  matcher: ['/((?!api|_next|_vercel|offline|.*\\..*).*)'],
};
