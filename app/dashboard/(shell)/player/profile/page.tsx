import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapUserFromRow, type UserRow } from '@/lib/types/database-rows';
import { ProfileForm } from '@/components/dashboard/player/ProfileForm';

export default async function PlayerProfilePage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profileRow } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single<UserRow>();

  if (!profileRow) {
    redirect('/login');
  }

  return <ProfileForm profile={mapUserFromRow(profileRow)} />;
}
