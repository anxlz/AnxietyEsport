import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapUserFromRow, type UserRow } from '@/lib/types/database-rows';
import { ChatPanel } from '@/components/dashboard/shared/ChatPanel';

export default async function CoachChatPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userRows } = await supabase
    .from('users')
    .select('*')
    .neq('id', user.id)
    .eq('status', 'approved')
    .order('username', { ascending: true })
    .limit(30)
    .returns<UserRow[]>();

  const contacts = (userRows ?? []).map(mapUserFromRow);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-[#FAFAFA]">Chat</h1>
      <ChatPanel currentUserId={user.id} initialContacts={contacts} />
    </div>
  );
}
