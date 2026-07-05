import Link from 'next/link';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  mapRosterFromRow,
  mapRosterMemberFromRow,
  mapMatchFromRow,
  type RosterRow,
  type RosterMemberRow,
  type MatchRow,
} from '@/lib/types/database-rows';

export default async function ManagerOverviewPage(): Promise<ReactElement> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('*')
    .eq('manager_id', user.id)
    .eq('active', true)
    .returns<RosterRow[]>();

  const rosters = (rosterRows ?? []).map(mapRosterFromRow);
  const rosterIds = rosters.map((roster) => roster.id);

  const [{ data: memberRows }, { data: upcomingRows }, { data: recentRows }] = await Promise.all([
    rosterIds.length > 0
      ? supabase.from('roster_members').select('*').in('roster_id', rosterIds).returns<RosterMemberRow[]>()
      : Promise.resolve({ data: [] as RosterMemberRow[] }),
    rosterIds.length > 0
      ? supabase
          .from('matches')
          .select('*')
          .in('roster_id', rosterIds)
          .eq('status', 'scheduled')
          .order('match_date', { ascending: true })
          .limit(5)
          .returns<MatchRow[]>()
      : Promise.resolve({ data: [] as MatchRow[] }),
    rosterIds.length > 0
      ? supabase
          .from('matches')
          .select('*')
          .in('roster_id', rosterIds)
          .eq('status', 'completed')
          .order('match_date', { ascending: false })
          .limit(3)
          .returns<MatchRow[]>()
      : Promise.resolve({ data: [] as MatchRow[] }),
  ]);

  const members = (memberRows ?? []).map(mapRosterMemberFromRow);
  const upcomingMatches = (upcomingRows ?? []).map(mapMatchFromRow);
  const recentMatches = (recentRows ?? []).map(mapMatchFromRow);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <section className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">Upcoming matches</h2>
            <Link
              href="/dashboard/manager/matches/new"
              className="rounded-input bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
            >
              + New match
            </Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">
              No upcoming matches.{' '}
              <Link href="/dashboard/manager/matches/new" className="text-brand hover:underline">
                Schedule one →
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {upcomingMatches.map((match) => (
                <li
                  key={match.id}
                  className="flex items-center justify-between rounded-input border border-white/[0.07] bg-surface-elevated px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-[#FAFAFA]">vs {match.opponentName}</p>
                    <p className="text-xs text-[rgba(250,250,250,0.5)]">
                      {match.tournament ?? 'Friendly'}
                      {match.matchDate ? ` · ${new Date(match.matchDate).toLocaleString()}` : ''}
                      {match.region ? ` · ${match.region}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/manager/matches/${match.id}`}
                    className="text-xs text-brand hover:underline"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Your rosters</h2>
          {rosters.length === 0 ? (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">No rosters assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {rosters.map((roster) => (
                <li
                  key={roster.id}
                  className="flex items-center justify-between rounded-input border border-white/[0.07] bg-surface-elevated px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-[#FAFAFA]">{roster.name}</p>
                    <p className="text-xs text-[rgba(250,250,250,0.5)]">{roster.game}</p>
                  </div>
                  <span className="text-xs text-[rgba(250,250,250,0.4)]">
                    {members.filter((m) => m.rosterId === roster.id).length} members
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-white/[0.07] bg-surface-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-[#FAFAFA]">Recent results</h2>
          {recentMatches.length === 0 ? (
            <p className="text-sm text-[rgba(250,250,250,0.4)]">No completed matches yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentMatches.map((match) => {
                const won = match.teamScore > match.oppScore;
                return (
                  <li
                    key={match.id}
                    className="flex items-center justify-between rounded-input border border-white/[0.07] bg-surface-elevated px-3 py-2"
                  >
                    <span className="text-sm text-[#FAFAFA]">vs {match.opponentName}</span>
                    <span
                      className={
                        won
                          ? 'rounded-badge bg-green-500/20 px-2 py-0.5 text-xs text-green-400'
                          : 'rounded-badge bg-red-500/20 px-2 py-0.5 text-xs text-red-400'
                      }
                    >
                      {match.teamScore}–{match.oppScore}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
