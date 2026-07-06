import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapUserFromRow, type UserRow } from '@/lib/types/database-rows';
import { ProfileSettingsClient } from '@/components/dashboard/profile/ProfileSettingsClient';

interface ApplicationRow {
  id: string;
  role: string | null;
  status: string;
  created_at: string;
}

export default async function ProfileSettingsPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profileRow } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single<UserRow>();

  if (!profileRow) redirect('/login');

  const profile = mapUserFromRow(profileRow);

  // Check if user signed in via Discord (has provider identity)
  const { data: identities } = await supabase.auth.getUserIdentities();
  const discordIdentity = identities?.identities?.find((i) => i.provider === 'discord');
  const discordAvatarUrl = (discordIdentity?.identity_data?.avatar_url as string | undefined) ?? null;

  // Latest application
  const { data: latestApp } = await supabase
    .from('applications')
    .select('id, role, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single<ApplicationRow>();

  return (
    <ProfileSettingsClient
      profile={profile}
      email={user.email ?? ''}
      discordAvatarUrl={discordAvatarUrl}
      latestApplication={latestApp ?? null}
    />
  );
}
