import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapRosterFromRow,
  mapRosterMemberFromRow,
  type RosterRow,
  type RosterMemberRow,
} from '@/lib/types/database-rows';
import { RosterMembersTable } from '@/components/dashboard/manager/RosterMembersTable';
import type { User } from '@/lib/types/database';

export interface RosterMemberWithUser {
  memberId: string;
  rosterId: string;
  userId: string;
  ign: string | null;
  position: string | null;
  isCaptain: boolean;
  username: User['username'];
  fullName: User['fullName'];
  avatarUrl: User['avatarUrl'];
  country: User['country'];
}

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

export default async function ManagerRosterPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('*')
    .eq('manager_id', user.id)
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

  if (rosters.length === 0) {
    return (
      <div className="rounded-card border border-white/[0.07] bg-surface-card p-6">
        <p className="text-sm text-[rgba(250,250,250,0.5)]">
          You don&apos;t manage any rosters yet.
        </p>
      </div>
    );
  }

  return <RosterMembersTable rosters={rosters} members={members} />;
}
