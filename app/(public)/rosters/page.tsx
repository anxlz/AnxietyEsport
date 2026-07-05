import type { ReactElement } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapRosterFromRow,
  mapRosterMemberFromRow,
  type RosterRow,
  type RosterMemberRow,
} from '@/lib/types/database-rows';
import { RosterCard } from '@/components/public/RosterCard';

export default async function RostersPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .returns<RosterRow[]>();

  const rosters = (rosterRows ?? []).map(mapRosterFromRow);
  const rosterIds = rosters.map((roster) => roster.id);

  const { data: memberRows } =
    rosterIds.length > 0
      ? await supabase
          .from('roster_members')
          .select('*')
          .in('roster_id', rosterIds)
          .returns<RosterMemberRow[]>()
      : { data: [] as RosterMemberRow[] };

  const members = (memberRows ?? []).map(mapRosterMemberFromRow);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[#FAFAFA] md:text-4xl">Our Rosters</h1>
      <p className="mt-2 text-[rgba(250,250,250,0.55)]">
        Every active Anxiety Esports roster competing right now.
      </p>

      {rosters.length === 0 ? (
        <p className="mt-10 text-sm text-[rgba(250,250,250,0.4)]">No active rosters yet — check back soon.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rosters.map((roster) => (
            <RosterCard
              key={roster.id}
              roster={roster}
              members={members.filter((member) => member.rosterId === roster.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
