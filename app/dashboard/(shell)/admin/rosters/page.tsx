import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapRosterFromRow, mapRosterMemberFromRow, type RosterRow, type RosterMemberRow } from '@/lib/types/database-rows';
import { RosterMembersTable } from '@/components/dashboard/manager/RosterMembersTable';
import { CreateRosterForm } from '@/components/dashboard/admin/CreateRosterForm';
import type { RosterMemberWithUser } from '@/app/dashboard/(shell)/manager/roster/page';

interface RosterMemberJoinedRow extends RosterMemberRow {
  users: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    ign: string | null;
    country: string | null;
  } | null;
}

export default async function AdminRostersPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<RosterRow[]>();

  const rosters = (rosterRows ?? []).map(mapRosterFromRow);
  const rosterIds = rosters.map((r) => r.id);

  const { data: memberRows } =
    rosterIds.length > 0
      ? await supabase
          .from('roster_members')
          .select('*, users(id, username, full_name, avatar_url, ign, country)')
          .in('roster_id', rosterIds)
          .returns<RosterMemberJoinedRow[]>()
      : { data: [] as RosterMemberJoinedRow[] };

  const members: RosterMemberWithUser[] = (memberRows ?? []).map((row) => {
    const base = mapRosterMemberFromRow(row);
    return {
      memberId: base.id,
      rosterId: base.rosterId,
      userId: base.userId,
      ign: base.ign,
      position: base.position,
      isCaptain: base.isCaptain,
      username: row.users?.username ?? null,
      fullName: row.users?.full_name ?? null,
      avatarUrl: row.users?.avatar_url ?? null,
      country: row.users?.country ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#FAFAFA]">Roster management</h1>
      </div>

      <CreateRosterForm />

      {rosters.length === 0 ? (
        <p className="text-sm text-[rgba(250,250,250,0.4)]">No rosters yet. Create one to get started.</p>
      ) : (
        <RosterMembersTable rosters={rosters} members={members} />
      )}
    </div>
  );
}
