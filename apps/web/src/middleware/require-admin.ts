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
  if (!user) return notFoundResponse();

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') return notFoundResponse();

  return null;
}

function notFoundResponse(): NextResponse {
  return new NextResponse(null, { status: 404 });
}
