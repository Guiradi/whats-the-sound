import { env } from '@/env';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Gate for `/[locale]/admin/*` routes. Returns `null` when the request is
 * allowed through (callers continue their chain). Returns a 404 response when
 * the user is not an admin — deliberately 404, not 403, so the route's
 * existence is not revealed.
 *
 * Dev escape hatch: `ALLOW_ADMIN_WITHOUT_ROLE=true` in `.env.local` bypasses
 * the check entirely. Hard-blocked in production (NODE_ENV === 'production').
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  if (env.ALLOW_ADMIN_WITHOUT_ROLE && env.NODE_ENV !== 'production') {
    return null;
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Read-only here; middleware-wide cookie writes happen in updateSupabaseSession.
        setAll(_cookiesToSet: CookieToSet[]) {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFoundResponse(request);

  // role is server-only post-hardening; use SECURITY DEFINER RPC instead.
  const { data: isAdmin } = await supabase.rpc('is_current_user_admin');
  if (isAdmin !== true) return notFoundResponse(request);

  return null;
}

function notFoundResponse(request: NextRequest): NextResponse {
  // Rewrite to a non-existent path under the current locale so the
  // [locale]/[...rest] catch-all renders the custom not-found page.
  const url = request.nextUrl.clone();
  const localeMatch = request.nextUrl.pathname.match(/^\/(pt-BR|en)\//);
  const locale = localeMatch?.[1] ?? 'pt-BR';
  url.pathname = `/${locale}/__not-found`;
  return NextResponse.rewrite(url, { status: 404 });
}
