import Link from 'next/link';
import type { ReactElement } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapRosterFromRow, mapMatchFromRow, type RosterRow, type MatchRow } from '@/lib/types/database-rows';
import type { MatchStatus } from '@/lib/types/database';

const STATUS_BADGE: Record<MatchStatus, string> = {
  scheduled: 'bg-[#8943F9]/15 text-[#8943F9]',
  live: 'bg-yellow-500/15 text-yellow-400',
  completed: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

export default async function ManagerMatchesPage(): Promise<ReactElement> {
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
  const rosterIds = rosters.map((roster) => roster.id);
  const rosterNameById = new Map(rosters.map((roster) => [roster.id, roster.name]));

  const { data: matchRows } =
    rosterIds.length > 0
      ? await supabase
          .from('matches')
          .select('*')
          .in('roster_id', rosterIds)
          .order('match_date', { ascending: false })
          .returns<MatchRow[]>()
      : { data: [] as MatchRow[] };

  const matches = (matchRows ?? []).map(mapMatchFromRow);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[#FAFAFA]">Matches</h1>
        <Link
          href="/dashboard/manager/matches/new"
          className="rounded-input bg-brand px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-hover"
        >
          + New match
        </Link>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-[rgba(250,250,250,0.4)]">
          No matches yet.{' '}
          <Link href="/dashboard/manager/matches/new" className="text-brand hover:underline">
            Schedule one →
          </Link>
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-white/[0.07] bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-left text-xs text-[rgba(250,250,250,0.5)]">
                <th className="px-4 py-3">Opponent</th>
                <th className="px-4 py-3">Roster</th>
                <th className="px-4 py-3">Tournament</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-b border-white/[0.05] last:border-b-0">
                  <td className="px-4 py-3 text-[#FAFAFA]">vs {match.opponentName}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">
                    {rosterNameById.get(match.rosterId) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">{match.tournament ?? '—'}</td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">
                    {match.matchDate ? new Date(match.matchDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-badge px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[match.status]}`}>
                      {match.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[rgba(250,250,250,0.7)]">
                    {match.teamScore}–{match.oppScore}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/manager/matches/${match.id}`} className="text-xs text-brand hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
