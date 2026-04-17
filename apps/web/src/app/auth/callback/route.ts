import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

function sanitizeNext(value: string | null): string {
  if (!value) return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNext(searchParams.get('next'));

  // DEBUG: log every param Supabase sends back
  console.log('[auth/callback] URL params:', Object.fromEntries(searchParams.entries()));

  if (!code) {
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    console.error('[auth/callback] No code received.', { error: errorParam, errorDesc });
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message, error);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  console.log('[auth/callback] Session created, redirecting to:', next);
  return NextResponse.redirect(`${origin}${next}`);
}
