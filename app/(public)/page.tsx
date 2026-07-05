import Link from 'next/link';
import type { ReactElement } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapRosterFromRow,
  mapRosterMemberFromRow,
  mapMatchFromRow,
  type RosterRow,
  type RosterMemberRow,
  type MatchRow,
} from '@/lib/types/database-rows';
import type { Roster, RosterMember, Match } from '@/lib/types/database';
import { HomeHero } from '@/components/public/HomeHero';
import { RosterCarousel } from '@/components/public/RosterCarousel';
import { ResultsTeaser } from '@/components/public/ResultsTeaser';

async function getActiveRosters(): Promise<{ roster: Roster; members: RosterMember[] }[]> {
  const supabase = await createSupabaseServerClient();

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('*')
    .eq('active', true)
    .returns<RosterRow[]>();

  if (!rosterRows || rosterRows.length === 0) {
    return [];
  }

  const rosters = rosterRows.map(mapRosterFromRow);

  const { data: memberRows } = await supabase
    .from('roster_members')
    .select('*')
    .in('roster_id', rosters.map((roster) => roster.id))
    .returns<RosterMemberRow[]>();

  const members = (memberRows ?? []).map(mapRosterMemberFromRow);

  return rosters.map((roster) => ({
    roster,
    members: members.filter((member) => member.rosterId === roster.id),
  }));
}

async function getRecentResults(): Promise<Match[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'completed')
    .order('match_date', { ascending: false })
    .limit(3)
    .returns<MatchRow[]>();

  return (data ?? []).map(mapMatchFromRow);
}

export default async function HomePage(): Promise<ReactElement> {
  const [rosterGroups, recentResults] = await Promise.all([
    getActiveRosters(),
    getRecentResults(),
  ]);

  return (
    <main>
      <HomeHero />
      <RosterCarousel rosterGroups={rosterGroups} />
      <ResultsTeaser matches={recentResults} />
    </main>
  );
}
