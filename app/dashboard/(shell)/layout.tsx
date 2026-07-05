import { redirect } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DashboardShellClient } from '@/components/dashboard/DashboardShellClient';
import type { UserRole, UserStatus } from '@/lib/types/database';

interface DashboardShellLayoutProps {
  children: ReactNode;
}

export default async function DashboardShellLayout({
  children,
}: DashboardShellLayoutProps): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, status, username, avatar_url')
    .eq('id', user.id)
    .single<{
      role: UserRole | null;
      status: UserStatus;
      username: string | null;
      avatar_url: string | null;
    }>();

  if (!profile || profile.status !== 'approved' || !profile.role) {
    redirect('/apply/status');
  }

  return (
    <DashboardShellClient
      role={profile.role}
      username={profile.username}
      avatarUrl={profile.avatar_url}
      userId={user.id}
    >
      {children}
    </DashboardShellClient>
  );
}
