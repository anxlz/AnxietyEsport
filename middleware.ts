// middleware.ts
// Runs on every request matched by `config.matcher` below.
//
// Rules implemented:
// 1. Refresh the Supabase session (required for SSR auth to work at all).
// 2. Unauthenticated users hitting a /dashboard/* route -> redirect to /login.
// 3. Authenticated users with status='pending' -> can only see /apply/status
//    (and a small allowlist of account-level pages); everything else under
//    /dashboard/* redirects them to /apply/status.
// 4. Authenticated + approved users are redirected away from /dashboard/[role]
//    routes that don't match their own role, into their own dashboard.
// 5. Admins can access every /dashboard/* route.

import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import type { UserRole, UserStatus } from '@/lib/types/database';

const DASHBOARD_ROLE_SEGMENTS: UserRole[] = ['player', 'manager', 'coach', 'staff', 'admin'];

function dashboardRoleFromPath(pathname: string): UserRole | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const segment = match?.[1];
  if (segment && (DASHBOARD_ROLE_SEGMENTS as string[]).includes(segment)) {
    return segment as UserRole;
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isRequestMeetingRoute = pathname.startsWith('/dashboard/request-meeting');

  if (!isDashboardRoute) {
    return supabaseResponse;
  }

  // 2. Not logged in at all -> /login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Look up role/status. This is a single small lookup per request; for
  // high-traffic production use you may prefer to encode role/status as a
  // custom JWT claim via a Supabase Auth hook to avoid the extra query.
  // Service-role client is used here because middleware runs before RLS
  // context is meaningfully scoped for this kind of lookup and we only ever
  // read the current user's own row by id.
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: profile } = await serviceClient
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single<{ role: UserRole | null; status: UserStatus }>();

  const role = profile?.role ?? null;
  const status = profile?.status ?? 'pending';

  // 3. Pending/rejected/suspended users can't enter role dashboards.
  if (status !== 'approved' && !isRequestMeetingRoute) {
    if (pathname !== '/apply/status') {
      const url = request.nextUrl.clone();
      url.pathname = '/apply/status';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // request-meeting is shared across all approved roles; no further check.
  if (isRequestMeetingRoute) {
    return supabaseResponse;
  }

  // 4. Approved users: enforce role match on /dashboard/[role]/*.
  const routeRole = dashboardRoleFromPath(pathname);
  if (routeRole && role !== 'admin' && role !== routeRole) {
    const url = request.nextUrl.clone();
    url.pathname = role ? `/dashboard/${role}` : '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization
     * files, since the session refresh is cheap but unnecessary there.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
