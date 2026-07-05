import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { UserRole, UserStatus } from '@/lib/types/database';

export default async function DashboardPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single<{ role: UserRole | null; status: UserStatus }>();

  if (!profile || profile.status !== 'approved') {
    redirect('/apply/status');
  }

  if (profile.role) {
    redirect(`/dashboard/${profile.role}`);
  }

  redirect('/apply/status');
}
