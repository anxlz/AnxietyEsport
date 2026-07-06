// app/auth/callback/route.ts
// Handles the redirect back from Supabase Auth after an OAuth flow (Discord).
//
// Flow:
//   1. Exchange the `code` for a session.
//   2. Check if a public.users row already exists for this auth user.
//      - YES → send them to their dashboard (middleware handles role routing).
//      - NO  → this is a brand-new Discord sign-in; redirect to /apply with
//              their Discord profile pre-filled as query params so they only
//              need to pick a role + write their reason, not re-type their name.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return NextResponse.redirect(`${origin}/login?error=missing_env`);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error, data } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message ?? 'auth_failed')}`);
  }

  const authUser = data.user;

  // Check if this user already has a public.users row (i.e. returning user).
  // Use the service-role client so RLS doesn't interfere with this check.
  const { createClient } = await import('@supabase/supabase-js');
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id, status')
    .eq('id', authUser.id)
    .single<{ id: string; status: string }>();

  // Returning user — let middleware handle role-based routing.
  if (existingUser) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Brand-new Discord user — extract their Discord profile from the identity.
  // Supabase stores it in user_metadata after OAuth.
  const meta = authUser.user_metadata ?? {};

  // Discord provides: full_name (display name), name (username), email,
  // avatar_url, provider_id (Discord user ID / snowflake).
  const fullName = (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? '';
  const username = ((meta.name as string | undefined) ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const email = (meta.email as string | undefined) ?? authUser.email ?? '';
  const discordId = (meta.provider_id as string | undefined) ?? '';
  const avatarUrl = (meta.avatar_url as string | undefined) ?? '';

  // Redirect to /apply with Discord info pre-filled so the user only needs
  // to complete Step 2 (role + reason) and Step 3 (socials).
  const params = new URLSearchParams({
    discord: '1',
    fullName,
    username,
    email,
    discordId,
    avatarUrl,
  });

  return NextResponse.redirect(`${origin}/apply?${params.toString()}`);
}
