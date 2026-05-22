import { env } from '@/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

function sanitizeNext(value: string | null): string {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNext(searchParams.get('next'));
  const guestId = searchParams.get('guest_id');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // If the user was a guest before logging in, migrate their guest profile.
  // Await the migration so XP/achievements that depend on the migrated guest
  // row are visible by the time the redirect resolves. Failures are logged but
  // never block the OAuth flow — the user gets a clean session either way.
  if (guestId && UUID_PATTERN.test(guestId)) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/guest/migrate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ guestId }),
        });
        if (!res.ok) {
          console.error(
            `guest-migration failed: status=${res.status} guestId=${guestId.slice(0, 8)}…`,
          );
        }
      } catch (err) {
        console.error('guest-migration request threw:', err);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
