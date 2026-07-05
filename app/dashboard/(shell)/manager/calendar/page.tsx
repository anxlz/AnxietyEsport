import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapRosterFromRow, mapMatchFromRow, type RosterRow, type MatchRow } from '@/lib/types/database-rows';
import { ManagerCalendarClient } from '@/components/dashboard/manager/ManagerCalendarClient';

export default async function ManagerCalendarPage(): Promise<ReactElement> {
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

  const rosterIds = (rosterRows ?? []).map(mapRosterFromRow).map((r) => r.id);

  const { data: matchRows } =
    rosterIds.length > 0
      ? await supabase.from('matches').select('*').in('roster_id', rosterIds).returns<MatchRow[]>()
      : { data: [] as MatchRow[] };

  const matches = (matchRows ?? []).map(mapMatchFromRow);

  return <ManagerCalendarClient matches={matches} />;
}
