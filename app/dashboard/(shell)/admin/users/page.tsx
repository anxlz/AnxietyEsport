import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapUserFromRow, type UserRow } from '@/lib/types/database-rows';
import { UsersTable } from '@/components/dashboard/admin/UsersTable';

export default async function AdminUsersPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userRows } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<UserRow[]>();

  const users = (userRows ?? []).map(mapUserFromRow);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-[#FAFAFA]">Users</h1>
      <UsersTable users={users} />
    </div>
  );
}
